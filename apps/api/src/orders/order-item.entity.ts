import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id' })
  productId: number;

  /** Lưu lại tên & đơn giá tại thời điểm đặt (giá sản phẩm có thể đổi sau này). */
  @Column({ length: 120 })
  name: string;

  /** null với món chỉ có 1 cỡ (bánh, chanh…). */
  @Column({ type: 'varchar', length: 1, nullable: true })
  size: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  toppings: string[];

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;
}
