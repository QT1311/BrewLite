import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  pay(
    @Req() req: AuthedRequest,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.payments.pay(req.user!.id, key, dto);
  }
}
