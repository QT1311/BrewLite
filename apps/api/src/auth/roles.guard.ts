import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';
import { AuthedRequest } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

/**
 * Kiểm tra vai trò theo dữ liệu mới nhất trong CSDL (không tin vai trò trong token),
 * nên tài khoản bị khoá hoặc đổi quyền có hiệu lực ngay. Phải đứng sau `JwtAuthGuard`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new UnauthorizedException('Thiếu token đăng nhập');
    if (!roles?.length) return true;
    const user = await this.users.findOne({ where: { id: req.user.id } });
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị khoá');
    if (!roles.includes(user.role)) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    return true;
  }
}
