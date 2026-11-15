import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user-role';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

class Dummy {
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  staffOnly() {}

  @Roles(UserRole.ADMIN)
  adminOnly() {}

  open() {}
}

describe('RolesGuard', () => {
  const repo = { findOne: jest.fn() };
  const guard = new RolesGuard(new Reflector(), repo as never);
  const ctx = (handler: keyof Dummy, user?: { id: number }) =>
    ({
      getHandler: () => Dummy.prototype[handler],
      getClass: () => Dummy,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => repo.findOne.mockReset());

  it('cho qua khi vai trò nằm trong danh sách', async () => {
    repo.findOne.mockResolvedValue({ id: 1, role: UserRole.STAFF, isActive: true });
    await expect(guard.canActivate(ctx('staffOnly', { id: 1 }))).resolves.toBe(true);
    repo.findOne.mockResolvedValue({ id: 2, role: UserRole.ADMIN, isActive: true });
    await expect(guard.canActivate(ctx('adminOnly', { id: 2 }))).resolves.toBe(true);
  });

  it('khách hàng và staff vào route admin bị 403', async () => {
    repo.findOne.mockResolvedValue({ id: 1, role: UserRole.CUSTOMER, isActive: true });
    await expect(guard.canActivate(ctx('staffOnly', { id: 1 }))).rejects.toBeInstanceOf(ForbiddenException);
    repo.findOne.mockResolvedValue({ id: 3, role: UserRole.STAFF, isActive: true });
    await expect(guard.canActivate(ctx('adminOnly', { id: 3 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tài khoản bị khoá hoặc đã bị xoá bị 401 dù token còn hạn', async () => {
    repo.findOne.mockResolvedValue({ id: 1, role: UserRole.STAFF, isActive: false });
    await expect(guard.canActivate(ctx('staffOnly', { id: 1 }))).rejects.toBeInstanceOf(UnauthorizedException);
    repo.findOne.mockResolvedValue(null);
    await expect(guard.canActivate(ctx('staffOnly', { id: 1 }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('thiếu thông tin đăng nhập thì từ chối; route không gắn vai trò thì cho qua', async () => {
    await expect(guard.canActivate(ctx('staffOnly'))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(ctx('open', { id: 1 }))).resolves.toBe(true);
  });
});
