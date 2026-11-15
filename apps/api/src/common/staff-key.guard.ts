import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * Bảo vệ API dành cho nhân viên quầy bằng header `x-staff-key`.
 * (MVP chưa có màn hình/role nhân viên — xem phạm vi mở rộng trong docs.)
 */
@Injectable()
export class StaffKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('STAFF_API_KEY') ??
      (this.config.get('NODE_ENV') === 'production' ? undefined : 'dev-staff-key');
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const given = req.headers['x-staff-key'];
    if (!expected || !given) throw new UnauthorizedException('Thiếu staff key');
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Staff key không đúng');
    return true;
  }
}
