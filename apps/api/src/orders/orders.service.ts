import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { unitPrice } from '../catalog/pricing';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertTransition, OrderStatus, PAYABLE_STATUSES } from './order-status';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

const MAX_LOCK_RETRIES = 5;

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

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
      const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const order = await m.save(m.create(Order, { userId, status: OrderStatus.PENDING, total, items }));
      return order.id;
    });
    return this.findForUser(userId, saved);
  }

  /**
   * Cộng/trừ tồn kho bằng optimistic locking: chỉ UPDATE khi `version` chưa đổi.
   * Nếu có transaction khác vừa cập nhật (affected = 0) thì đọc lại và thử lại.
   */
  async changeStock(m: EntityManager, productId: number, delta: number): Promise<Product> {
    for (let attempt = 0; attempt < MAX_LOCK_RETRIES; attempt++) {
      const p = await m.findOne(Product, { where: { id: productId } });
      if (!p) throw new NotFoundException(`Sản phẩm #${productId} không tồn tại`);
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
