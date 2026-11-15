import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  const repo = {
    findOne: jest.fn(),
    save: jest.fn(async (u) => ({ id: 7, ...u })),
    create: jest.fn((u) => u),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  it('đăng ký: băm mật khẩu, chuẩn hoá email và trả JWT', async () => {
    repo.findOne.mockResolvedValue(null);
    const res = await service.register({ email: ' A@B.com ', name: 'An', password: 'matkhau123' });
    const saved = repo.save.mock.calls[0][0];
    expect(saved.email).toBe('a@b.com');
    expect(saved.passwordHash).not.toBe('matkhau123');
    expect(await bcrypt.compare('matkhau123', saved.passwordHash)).toBe(true);
    expect(res.user).toEqual({ id: 7, email: 'a@b.com', name: 'An', role: UserRole.CUSTOMER });
    expect((await jwt.verifyAsync(res.accessToken)).sub).toBe(7);
    expect(JSON.stringify(res)).not.toContain('passwordHash');
  });

  it('đăng ký: email đã tồn tại → 409', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await expect(
      service.register({ email: 'a@b.com', name: 'An', password: 'matkhau123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('đăng nhập đúng → JWT hợp lệ', async () => {
    const passwordHash = await bcrypt.hash('matkhau123', 4);
    repo.findOne.mockResolvedValue({ id: 3, email: 'a@b.com', name: 'An', passwordHash, role: UserRole.CUSTOMER, isActive: true });
    const res = await service.login({ email: 'A@b.com', password: 'matkhau123' });
    expect((await jwt.verifyAsync(res.accessToken)).sub).toBe(3);
  });

  it('đăng nhập sai mật khẩu hoặc sai email → 401 cùng thông báo', async () => {
    const passwordHash = await bcrypt.hash('matkhau123', 4);
    repo.findOne.mockResolvedValueOnce({ id: 3, email: 'a@b.com', name: 'An', passwordHash, role: UserRole.CUSTOMER, isActive: true });
    const wrongPw = await service.login({ email: 'a@b.com', password: 'saimatkhau' }).catch((e) => e);
    repo.findOne.mockResolvedValueOnce(null);
    const wrongEmail = await service.login({ email: 'x@b.com', password: 'matkhau123' }).catch((e) => e);
    expect(wrongPw).toBeInstanceOf(UnauthorizedException);
    expect(wrongEmail).toBeInstanceOf(UnauthorizedException);
    expect(wrongPw.message).toBe(wrongEmail.message);
  });

  it('đăng ký công khai luôn tạo khách hàng, bỏ qua mọi vai trò client gửi lên', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.register({ email: 'x@b.com', name: 'X', password: 'matkhau123', role: 'admin' } as never);
    expect(repo.save.mock.calls[0][0].role).toBe(UserRole.CUSTOMER);
  });

  it('tài khoản bị khoá không đăng nhập được (403)', async () => {
    const passwordHash = await bcrypt.hash('matkhau123', 4);
    repo.findOne.mockResolvedValue({ id: 4, email: 's@b.com', name: 'S', passwordHash, role: UserRole.STAFF, isActive: false });
    await expect(service.login({ email: 's@b.com', password: 'matkhau123' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
