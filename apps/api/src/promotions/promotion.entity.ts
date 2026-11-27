import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum DiscountType {
  /** Giảm theo phần trăm tổng tiền (có thể giới hạn mức giảm tối đa). */
  PERCENT = 'PERCENT',
  /** Giảm một số tiền cố định (đồng). */
  FIXED = 'FIXED',
}

/** Mã khuyến mãi (FR-18). Số lượt dùng được giữ bằng UPDATE nguyên tử nên không vượt giới hạn khi đặt đồng thời. */
@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mã viết hoa, duy nhất (khách nhập không phân biệt hoa thường). */
  @Index({ unique: true })
  @Column({ length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  description: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 10 })
  discountType: DiscountType;

  /** PERCENT: 1–90 (%); FIXED: số tiền (đồng). */
  @Column({ type: 'int' })
  value: number;

  /** Giá trị đơn tối thiểu (tạm tính, đồng) để được áp mã. */
  @Column({ name: 'min_order_total', type: 'int', default: 0 })
  minOrderTotal: number;

  /** Mức giảm tối đa (đồng); null = không giới hạn. */
  @Column({ name: 'max_discount', type: 'int', nullable: true })
  maxDiscount: number | null;

  /** Tổng số lượt dùng cho phép; null = không giới hạn. */
  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
