import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { MIN_REDEEM_POINTS, pointsForTotal, pointsToVnd, redeemablePoints } from './loyalty';
import { LoyaltyTransaction } from './loyalty-transaction.entity';

/** Dạng đơn mà dịch vụ điểm thưởng cần đọc/ghi khi dùng hoặc hoàn điểm. */
type RedeemableOrder = Pick<Order, 'id' | 'userId' | 'pointsRedeemed' | 'pointsDiscount'>;

export interface LoyaltySummary {
  points: number;
  transactions: Array<{ id: number; orderId: number; points: number; type: string; createdAt: Date }>;
}

@Injectable()
export class LoyaltyService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /**
   * Cộng điểm cho đơn vừa được thanh toán thành công. Gọi trong transaction thanh toán (đơn đang bị khoá),
   * nên không thể cộng hai lần; UNIQUE(order_id, type) là chốt chặn cuối. Trả về số điểm vừa cộng.
   */
  async award(m: EntityManager, order: Pick<Order, 'id' | 'userId' | 'total'>): Promise<number> {
    const points = pointsForTotal(order.total);
    if (points <= 0) return 0;
    if (await m.findOne(LoyaltyTransaction, { where: { orderId: order.id, type: 'EARN' } })) return 0;
    await m.save(m.create(LoyaltyTransaction, { userId: order.userId, orderId: order.id, type: 'EARN', points }));
    await m
      .createQueryBuilder()
      .update(User)
      .set({ loyaltyPoints: () => 'loyalty_points + :points' })
      .setParameter('points', points)
      .where('id = :id', { id: order.userId })
      .execute();
    return points;
  }

  /**
   * Dùng điểm cho đơn chưa thanh toán (FR-25): 1 điểm = 100đ, cần tối thiểu MIN_REDEEM_POINTS điểm.
   * Dùng tối đa số dư nhưng đơn vẫn phải trả tối thiểu MIN_PAYABLE. `payable` là số tiền đơn sau khi trừ mã khuyến mãi.
   * Trừ điểm bằng UPDATE có điều kiện (`loyalty_points >= n`) nên hai đơn cùng dùng điểm một lúc không thể làm số dư âm.
   * Gọi trong transaction của đơn (đơn đang bị khoá). Trả về số điểm đã dùng.
   */
  async redeem(m: EntityManager, order: RedeemableOrder, payable: number): Promise<number> {
    const user = await m.findOne(User, { where: { id: order.userId } });
    const balance = user?.loyaltyPoints ?? 0;
    if (balance < MIN_REDEEM_POINTS) {
      throw new UnprocessableEntityException(
        `Cần tối thiểu ${MIN_REDEEM_POINTS} điểm (${pointsToVnd(MIN_REDEEM_POINTS).toLocaleString('vi-VN')}đ) để đổi điểm, bạn đang có ${balance} điểm`,
      );
    }
    const points = redeemablePoints(balance, payable);
    if (points <= 0) throw new UnprocessableEntityException('Đơn hàng quá nhỏ để dùng điểm thưởng');

    const res = await m
      .createQueryBuilder()
      .update(User)
      .set({ loyaltyPoints: () => 'loyalty_points - :points' })
      .setParameter('points', points)
      .where('id = :id AND loyalty_points >= :points', { id: order.userId })
      .execute();
    if (res.affected !== 1) throw new ConflictException('Số dư điểm vừa thay đổi, vui lòng thử lại');

    await m.save(m.create(LoyaltyTransaction, { userId: order.userId, orderId: order.id, type: 'REDEEM', points: -points }));
    order.pointsRedeemed = points;
    order.pointsDiscount = pointsToVnd(points);
    return points;
  }

  /** Hoàn điểm đã dùng cho đơn (khi khách bỏ dùng điểm, đổi mã khuyến mãi hoặc huỷ đơn). Trả về số điểm đã hoàn. */
  async refund(m: EntityManager, order: RedeemableOrder): Promise<number> {
    const points = order.pointsRedeemed;
    if (!points) return 0;
    await m
      .createQueryBuilder()
      .update(User)
      .set({ loyaltyPoints: () => 'loyalty_points + :points' })
      .setParameter('points', points)
      .where('id = :id', { id: order.userId })
      .execute();
    await m.save(m.create(LoyaltyTransaction, { userId: order.userId, orderId: order.id, type: 'REFUND', points }));
    order.pointsRedeemed = 0;
    order.pointsDiscount = 0;
    return points;
  }

  async summary(userId: number): Promise<LoyaltySummary> {
    const user = await this.db.getRepository(User).findOne({ where: { id: userId } });
    const txs = await this.db
      .getRepository(LoyaltyTransaction)
      .find({ where: { userId }, order: { createdAt: 'DESC', id: 'DESC' }, take: 20 });
    return {
      points: user?.loyaltyPoints ?? 0,
      transactions: txs.map((t) => ({ id: t.id, orderId: t.orderId, points: t.points, type: t.type, createdAt: t.createdAt })),
    };
  }
}
