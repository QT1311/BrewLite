import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  /** Số điểm hiện có và lịch sử cộng điểm gần đây của chính người dùng. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.loyalty.summary(req.user!.id);
  }
}
