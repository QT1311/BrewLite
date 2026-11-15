import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from '../orders/order.entity';

export type PaymentMethod = 'EWALLET' | 'CARD';
export type PaymentStatus = 'SUCCEEDED' | 'FAILED';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  /** UNIQUE: chốt chặn cuối cùng chống ghi trùng khi 2 request cùng key chạy song song (FR-13). */
  @Index({ unique: true })
  @Column({ name: 'idempotency_key', length: 100 })
  idempotencyKey: string;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 10 })
  method: PaymentMethod;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  status: PaymentStatus;

  @Column({ name: 'transaction_ref', type: 'varchar', length: 64, nullable: true })
  transactionRef: string | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 200, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
