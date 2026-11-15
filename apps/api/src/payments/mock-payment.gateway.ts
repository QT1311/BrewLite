import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentMethod } from './payment.entity';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
  /** Chỉ dùng cho demo/kiểm thử: buộc giao dịch thất bại. */
  simulateFailure?: boolean;
}

export interface ChargeResult {
  success: boolean;
  transactionRef: string | null;
  failureReason: string | null;
}

/**
 * Cổng thanh toán giả lập (thay cho Momo/VNPay/Stripe thật — ngoài phạm vi MVP).
 * Tách thành provider riêng để sau này thay bằng adapter thật mà không sửa PaymentsService.
 */
@Injectable()
export class MockPaymentGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.simulateFailure) {
      const reason = req.method === 'CARD' ? 'Thẻ bị từ chối (giả lập)' : 'Ví không đủ số dư (giả lập)';
      return { success: false, transactionRef: null, failureReason: reason };
    }
    return { success: true, transactionRef: `MOCK-${randomUUID()}`, failureReason: null };
  }
}
