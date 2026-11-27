import {
  BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { assertTransition, OrderStatus, PAYABLE_STATUSES } from '../orders/order-status';
import { Order } from '../orders/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MockPaymentGateway } from './mock-payment.gateway';
import { Payment } from './payment.entity';

export interface PaymentResult {
  paymentId: number;
  orderId: number;
  status: Payment['status'];
  orderStatus: OrderStatus;
  amount: number;
  method: Payment['method'];
  transactionRef: string | null;
  failureReason: string | null;
  /** Điểm thưởng vừa được cộng cho lần thanh toán này (0 nếu thất bại hoặc là kết quả phát lại). */
  pointsEarned: number;
}

const KEY_RE = /^[A-Za-z0-9_-]{8,100}$/;

@Injectable()
export class PaymentsService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly gateway: MockPaymentGateway,
    private readonly loyalty: LoyaltyService,
  ) {}

  async pay(userId: number, idempotencyKey: string | undefined, dto: CreatePaymentDto): Promise<PaymentResult> {
    if (!idempotencyKey || !KEY_RE.test(idempotencyKey)) {
      throw new BadRequestException('Thiếu hoặc sai header Idempotency-Key (8–100 ký tự a-z, 0-9, -, _)');
    }

    // 1) Key đã dùng → trả lại đúng kết quả cũ, không trừ tiền lần nữa.
    const existing = await this.db.getRepository(Payment).findOne({ where: { idempotencyKey } });
    if (existing) return this.replay(existing, userId, dto.orderId);

    try {
      return await this.db.transaction(async (m) => {
        // 2) Khoá dòng đơn hàng: các request thanh toán cùng đơn phải xếp hàng.
        const order = await m.findOne(Order, { where: { id: dto.orderId }, lock: { mode: 'pessimistic_write' } });
        if (!order || order.userId !== userId) throw new NotFoundException('Không tìm thấy đơn hàng');

        // 3) Kiểm tra lại key sau khi có khoá (request song song cùng key có thể vừa ghi xong).
        const again = await m.findOne(Payment, { where: { idempotencyKey } });
        if (again) return this.replay(again, userId, dto.orderId);

        if (!PAYABLE_STATUSES.includes(order.status)) {
          throw new ConflictException(`Đơn #${order.id} đang ở trạng thái ${order.status}, không thể thanh toán`);
        }

        const result = await this.gateway.charge({
          amount: order.total,
          method: dto.method,
          simulateFailure: dto.simulateFailure,
        });

        const payment = await m.save(
          m.create(Payment, {
            idempotencyKey,
            orderId: order.id,
            userId,
            method: dto.method,
            amount: order.total,
            status: result.success ? 'SUCCEEDED' : 'FAILED',
            transactionRef: result.transactionRef,
            failureReason: result.failureReason,
          }),
        );

        const next = result.success ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;
        if (next !== order.status) {
          assertTransition(order.status, next);
          order.status = next;
          await m.save(order);
        }
        // Cộng điểm thưởng cùng transaction với việc chuyển đơn sang PAID (FR-18).
        const pointsEarned = result.success ? await this.loyalty.award(m, order) : 0;
        return this.toResult(payment, pointsEarned);
      });
    } catch (err) {
      // 4) Hai request cùng key lọt qua đồng thời → UNIQUE chặn bản ghi thứ hai; trả kết quả của bản ghi đầu.
      if (err instanceof QueryFailedError && (err as QueryFailedError & { code?: string }).code === '23505') {
        const winner = await this.db.getRepository(Payment).findOne({ where: { idempotencyKey } });
        if (winner) return this.replay(winner, userId, dto.orderId);
      }
      throw err;
    }
  }

  private replay(p: Payment, userId: number, orderId: number): PaymentResult {
    if (p.userId !== userId || p.orderId !== orderId) {
      throw new UnprocessableEntityException('Idempotency-Key này đã được dùng cho một yêu cầu khác');
    }
    return this.toResult(p);
  }

  private toResult(p: Payment, pointsEarned = 0): PaymentResult {
    return {
      paymentId: p.id,
      orderId: p.orderId,
      status: p.status,
      orderStatus: p.status === 'SUCCEEDED' ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED,
      amount: p.amount,
      method: p.method,
      transactionRef: p.transactionRef,
      failureReason: p.failureReason,
      pointsEarned,
    };
  }
}
