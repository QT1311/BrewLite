import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MockPaymentGateway } from './mock-payment.gateway';
import { Payment } from './payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), AuthModule, LoyaltyModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentGateway],
})
export class PaymentsModule {}
