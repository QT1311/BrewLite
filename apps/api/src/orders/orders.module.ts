import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StaffKeyGuard } from '../common/staff-key.guard';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, StaffKeyGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
