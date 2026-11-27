import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  /** Mật khẩu đã băm bằng bcrypt — không bao giờ lưu plaintext (NFR-02). */
  @Column({ name: 'password_hash' })
  passwordHash: string;

  /** Vai trò; đăng ký công khai luôn là customer, staff do admin tạo, admin đầu tiên được seed bằng biến môi trường. */
  @Column({ type: 'varchar', length: 10, default: UserRole.CUSTOMER })
  role: UserRole;

  /** Tài khoản bị khoá (false) không đăng nhập và không dùng được token cũ cho route theo vai trò. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Điểm thưởng tích lũy (FR-18); sổ chi tiết nằm ở bảng loyalty_transactions. */
  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
