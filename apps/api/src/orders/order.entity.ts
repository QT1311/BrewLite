import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Promotion } from '../promotions/promotion.entity';
import { User } from '../users/user.entity';
import { OrderStatus } from './order-status';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status: OrderStatus;

  /** Số tiền phải trả (đồng), do server tính = tạm tính − giảm giá. */
  @Column({ type: 'int' })
  total: number;

  /** Mã khuyến mãi đang áp (FR-18); null nếu không dùng. Giữ thêm bản chụp mã để lịch sử không phụ thuộc admin sửa/xoá mã. */
  @Column({ name: 'promotion_id', type: 'int', nullable: true })
  promotionId: number | null;

  @ManyToOne(() => Promotion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion | null;

  @Column({ name: 'promotion_code', type: 'varchar', length: 30, nullable: true })
  promotionCode: string | null;

  /** Số tiền đã giảm bởi mã khuyến mãi (đồng). */
  @Column({ name: 'discount_amount', type: 'int', default: 0 })
  discountAmount: number;

  /** Điểm thưởng đang dùng cho đơn này (FR-25) và số tiền tương ứng (đồng). Tạm tính = total + discountAmount + pointsDiscount. */
  @Column({ name: 'points_redeemed', type: 'int', default: 0 })
  pointsRedeemed: number;

  @Column({ name: 'points_discount', type: 'int', default: 0 })
  pointsDiscount: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
