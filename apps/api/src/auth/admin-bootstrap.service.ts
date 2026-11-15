import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';

/**
 * Tạo admin đầu tiên từ biến môi trường `ADMIN_EMAIL` và `ADMIN_PASSWORD` (đặt trong Railway Variables).
 * Chỉ tạo khi chưa có tài khoản đó; nếu email đã tồn tại thì chỉ nâng lên admin và không đổi mật khẩu.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly log = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    if (password.length < 8) {
      this.log.warn('ADMIN_PASSWORD ngắn hơn 8 ký tự, bỏ qua việc tạo admin');
      return;
    }
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      if (existing.role !== UserRole.ADMIN || !existing.isActive) {
        await this.users.save({ ...existing, role: UserRole.ADMIN, isActive: true });
        this.log.log(`Đã nâng ${email} lên admin`);
      }
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(
      this.users.create({ email, name: 'Quản trị viên', passwordHash, role: UserRole.ADMIN, isActive: true }),
    );
    this.log.log(`Đã tạo tài khoản admin ${email}`);
  }
}
