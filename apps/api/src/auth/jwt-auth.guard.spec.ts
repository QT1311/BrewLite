import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function ctx(authorization?: string) {
  const req: any = { headers: authorization ? { authorization } : {} };
  return { req, context: { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });
  const guard = new JwtAuthGuard(jwt);

  it('cho qua khi token hợp lệ và gắn user vào request', async () => {
    const token = await jwt.signAsync({ sub: 5, email: 'a@b.com' });
    const { req, context } = ctx(`Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 5, email: 'a@b.com' });
  });

  it('từ chối khi thiếu token', async () => {
    await expect(guard.canActivate(ctx().context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('từ chối token sai chữ ký', async () => {
    const bad = await new JwtService({ secret: 'other' }).signAsync({ sub: 1 });
    await expect(guard.canActivate(ctx(`Bearer ${bad}`).context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('từ chối token hết hạn', async () => {
    const expired = await jwt.signAsync({ sub: 1 }, { expiresIn: '-10s' });
    await expect(guard.canActivate(ctx(`Bearer ${expired}`).context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
