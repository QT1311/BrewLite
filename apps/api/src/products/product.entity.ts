import { Column, Entity, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  // Giá thấp nhất (hiển thị "Từ …") tính bằng đồng, lưu số nguyên để tránh sai số số thực
  @Column({ type: 'int' })
  price: number;

  /** Giá theo từng size (VD {S:29000,M:39000,L:45000}); null = món chỉ có 1 cỡ, giá cố định = price. */
  @Column({ type: 'jsonb', nullable: true })
  sizePrices: Record<string, number> | null;

  /** Món có cho chọn topping hay không (trà, matcha, đá xay). */
  @Column({ type: 'boolean', default: false })
  allowToppings: boolean;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 40, default: 'ca-phe' })
  category: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  /** false = admin tạm ngưng bán: ẩn khỏi menu và không đặt được. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Optimistic locking: tăng 1 mỗi lần cập nhật tồn kho (FR-17). */
  @VersionColumn({ default: 1 })
  version: number;
}
