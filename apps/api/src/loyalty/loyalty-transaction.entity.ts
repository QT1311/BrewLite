import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';

/** EARN: cộng sau thanh toán; REDEEM: trừ khi dùng điểm cho đơn (số âm); REFUND: hoàn điểm khi gỡ dùng điểm hoặc huỷ đơn. */
export type LoyaltyType = 'EARN' | 'REDEEM' | 'REFUND';

/** Sổ cái điểm thưởng (FR-18, FR-25). Chỉ mục duy nhất một phần trên (order_id) cho EARN đảm bảo một đơn chỉ được cộng điểm một lần. */
@Entity('loyalty_transactions')
@Index(['orderId', 'type'], { unique: true, where: `"type" = 'EARN'` })
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ type: 'varchar', length: 10, default: 'EARN' })
  type: LoyaltyType;

  /** Dương khi cộng/hoàn, âm khi dùng điểm. */
  @Column({ type: 'int' })
  points: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
