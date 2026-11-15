import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: number; email: string };
}

/** Bảo vệ route: yêu cầu header `Authorization: Bearer <JWT>` hợp lệ (NFR-05). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const [type, token] = value?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Thiếu token đăng nhập');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; email: string }>(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
