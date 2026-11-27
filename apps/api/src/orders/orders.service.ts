import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { unitPrice } from '../catalog/pricing';
import { Product } from '../products/product.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertTransition, OrderStatus, PAYABLE_STATUSES } from './order-status';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

const MAX_LOCK_RETRIES = 5;

/** Các trạng thái quầy cần xử lý (đã thanh toán nhưng chưa giao). */
export const QUEUE_STATUSES = [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY];

/** Dạng đơn dành cho nhân viên/admin: có tên khách, không lộ mật khẩu băm hay dữ liệu thừa. */
export interface StaffOrderView {
  id: number;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  customerName: string;
  customerEmail?: string;
  items: Array<{ id: number; name: string; size: string | null; toppings: string[]; unitPrice: number; quantity: number }>;
}

function toStaffView(o: Order, withEmail: boolean): StaffOrderView {
  return {
    id: o.id,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customerName: o.user?.name ?? '',
    ...(withEmail ? { customerEmail: o.user?.email ?? '' } : {}),
    items: [...(o.items ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((i) => ({ id: i.id, name: i.name, size: i.size, toppings: i.toppings, unitPrice: i.unitPrice, quantity: i.quantity })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly promotions: PromotionsService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** Tạo đơn PENDING, giữ tồn kho trong cùng 1 transaction (FR-10, FR-17). */
  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    const saved = await this.db.transaction(async (m) => {
      const needed = new Map<number, number>();
      for (const it of dto.items) needed.set(it.productId, (needed.get(it.productId) ?? 0) + it.quantity);

      const products = new Map<number, Product>();
      // Sắp theo id để các transaction luôn khoá theo cùng thứ tự (tránh deadlock).
      for (const [productId, qty] of [...needed].sort((a, b) => a[0] - b[0])) {
        products.set(productId, await this.changeStock(m, productId, -qty));
      }

      const items = dto.items.map((it) => {
        const p = products.get(it.productId)!;
        const toppings = [...new Set(it.toppings)].sort();
        return m.create(OrderItem, {
          productId: p.id,
          name: p.name,
          size: p.sizePrices ? it.size ?? null : null,
          toppings,
          unitPrice: unitPrice(p, it.size, toppings),
          quantity: it.quantity,
        });
      });
      const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      let discount = 0;
      let promotionId: number | null = null;
      let promotionCode: string | null = null;
      if (dto.promoCode) {
        const r = await this.promotions.reserve(m, dto.promoCode, subtotal);
        discount = r.discount;
        promotionId = r.promotion.id;
        promotionCode = r.promotion.code;
      }
      const order = await m.save(
        m.create(Order, {
          userId, status: OrderStatus.PENDING, total: subtotal - discount,
          promotionId, promotionCode, discountAmount: discount, items,
        }),
      );
      return order.id;
    });
    return this.findForUser(userId, saved);
  }

  /** Hàng đợi của quầy: đơn đã thanh toán, cũ nhất trước (nhân viên xử lý theo thứ tự). */
  async findQueue(): Promise<StaffOrderView[]> {
    const orders = await this.db.getRepository(Order).find({
      where: { status: In(QUEUE_STATUSES) },
      relations: { items: true, user: true },
      order: { createdAt: 'ASC' },
    });
    return orders.map((o) => toStaffView(o, false));
  }

  /** Toàn bộ đơn cho admin, mới nhất trước; có thể lọc theo trạng thái. */
  async findAllForAdmin(status?: OrderStatus, limit = 100): Promise<StaffOrderView[]> {
    const orders = await this.db.getRepository(Order).find({
      where: status ? { status } : {},
      relations: { items: true, user: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return orders.map((o) => toStaffView(o, true));
  }

  /**
   * Cộng/trừ tồn kho bằng optimistic locking: chỉ UPDATE khi `version` chưa đổi.
   * Nếu có transaction khác vừa cập nhật (affected = 0) thì đọc lại và thử lại.
   */
  async changeStock(m: EntityManager, productId: number, delta: number): Promise<Product> {
    for (let attempt = 0; attempt < MAX_LOCK_RETRIES; attempt++) {
      const p = await m.findOne(Product, { where: { id: productId } });
      if (!p) throw new NotFoundException(`Sản phẩm #${productId} không tồn tại`);
      if (delta < 0 && !p.isActive) {
        throw new ConflictException(`"${p.name}" đang tạm ngưng bán`);
      }
      if (p.stock + delta < 0) {
        throw new ConflictException(`"${p.name}" không đủ hàng (còn ${p.stock})`);
      }
      const res = await m
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => 'stock + :delta', version: () => 'version + 1' })
        .where('id = :id AND version = :version', { id: productId, version: p.version })
        .setParameter('delta', delta)
        .execute();
      if (res.affected === 1) return p;
    }
    throw new ConflictException('Sản phẩm đang được nhiều người đặt cùng lúc, vui lòng thử lại');
  }

  findMine(userId: number): Promise<Order[]> {
    return this.db.getRepository(Order).find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  /** Chỉ trả đơn của chính người dùng; đơn người khác báo 404 để không lộ thông tin. */
  async findForUser(userId: number, id: number): Promise<Order> {
    const order = await this.db.getRepository(Order).findOne({ where: { id, userId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }

  /** Áp (hoặc đổi) mã khuyến mãi cho đơn chưa thanh toán. Mã cũ được trả lại lượt dùng; điểm đang dùng được tính lại theo số tiền mới. */
  async applyPromotion(userId: number, id: number, code: string): Promise<Order> {
    await this.db.transaction(async (m) => {
      const order = await this.lockPayableOrder(m, userId, id);
      const subtotal = await this.subtotalOf(m, order.id);
      await this.promotions.release(m, order.promotionId);
      const { promotion, discount } = await this.promotions.reserve(m, code, subtotal);
      order.promotionId = promotion.id;
      order.promotionCode = promotion.code;
      order.discountAmount = discount;
      await this.repriceWithPoints(m, order, subtotal);
      await m.save(order);
    });
    return this.findForUser(userId, id);
  }

  async removePromotion(userId: number, id: number): Promise<Order> {
    await this.db.transaction(async (m) => {
      const order = await this.lockPayableOrder(m, userId, id);
      if (order.promotionId == null && order.discountAmount === 0) return;
      const subtotal = await this.subtotalOf(m, order.id);
      await this.promotions.release(m, order.promotionId);
      order.promotionId = null;
      order.promotionCode = null;
      order.discountAmount = 0;
      await this.repriceWithPoints(m, order, subtotal);
      await m.save(order);
    });
    return this.findForUser(userId, id);
  }

  /** Dùng điểm thưởng cho đơn chưa thanh toán (FR-25): 1 điểm = 100đ, cần tối thiểu 100 điểm. */
  async redeemPoints(userId: number, id: number): Promise<Order> {
    await this.db.transaction(async (m) => {
      const order = await this.lockPayableOrder(m, userId, id);
      const subtotal = await this.subtotalOf(m, order.id);
      await this.loyalty.refund(m, order); // tính lại từ đầu, không dùng điểm hai lần
      await this.loyalty.redeem(m, order, subtotal - order.discountAmount);
      order.total = subtotal - order.discountAmount - order.pointsDiscount;
      await m.save(order);
    });
    return this.findForUser(userId, id);
  }

  async removePoints(userId: number, id: number): Promise<Order> {
    await this.db.transaction(async (m) => {
      const order = await this.lockPayableOrder(m, userId, id);
      if (order.pointsRedeemed === 0) return;
      const subtotal = await this.subtotalOf(m, order.id);
      await this.loyalty.refund(m, order);
      order.total = subtotal - order.discountAmount;
      await m.save(order);
    });
    return this.findForUser(userId, id);
  }

  /**
   * Tính lại tổng sau khi mã khuyến mãi đổi: hoàn điểm đang dùng rồi dùng lại tối đa có thể.
   * Nếu không còn dùng được điểm (đơn quá nhỏ) thì đơn chỉ còn giảm giá theo mã.
   */
  private async repriceWithPoints(m: EntityManager, order: Order, subtotal: number): Promise<void> {
    const hadPoints = order.pointsRedeemed > 0;
    await this.loyalty.refund(m, order);
    if (hadPoints) {
      try {
        await this.loyalty.redeem(m, order, subtotal - order.discountAmount);
      } catch (err) {
        if (!(err instanceof UnprocessableEntityException)) throw err;
      }
    }
    order.total = subtotal - order.discountAmount - order.pointsDiscount;
  }

  /** Tạm tính của đơn = tổng thành tiền các dòng (không phụ thuộc giảm giá). */
  private async subtotalOf(m: EntityManager, orderId: number): Promise<number> {
    const items = await m.find(OrderItem, { where: { order: { id: orderId } } });
    return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }

  private async lockPayableOrder(m: EntityManager, userId: number, id: number): Promise<Order> {
    const order = await m.findOne(Order, { where: { id, userId }, lock: { mode: 'pessimistic_write' } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (!PAYABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(`Đơn #${order.id} đang ở trạng thái ${order.status}, không thể thay đổi giảm giá`);
    }
    return order;
  }

  async cancel(userId: number, id: number): Promise<Order> {
    await this.db.transaction(async (m) => {
      const order = await m.findOne(Order, { where: { id, userId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const wasHoldingStock = PAYABLE_STATUSES.includes(order.status);
      assertTransition(order.status, OrderStatus.CANCELLED);
      if (wasHoldingStock) {
        const items = await m.find(OrderItem, { where: { order: { id } } });
        const back = new Map<number, number>();
        for (const it of items) back.set(it.productId, (back.get(it.productId) ?? 0) + it.quantity);
        for (const [productId, qty] of [...back].sort((a, b) => a[0] - b[0])) {
          await this.changeStock(m, productId, qty);
        }
      }
      // Đơn huỷ trả lại lượt dùng mã khuyến mãi và điểm đã dùng (giống hoàn kho).
      await this.promotions.release(m, order.promotionId);
      await this.loyalty.refund(m, order);
      order.status = OrderStatus.CANCELLED;
      await m.save(order);
    });
    return this.findForUser(userId, id);
  }

  /** Nhân viên quầy cập nhật tiến độ pha chế: PAID → PREPARING → READY → COMPLETED. */
  async advance(id: number, to: OrderStatus): Promise<Order> {
    return this.db.transaction(async (m) => {
      const order = await m.findOne(Order, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      assertTransition(order.status, to);
      order.status = to;
      return m.save(order);
    });
  }
}
