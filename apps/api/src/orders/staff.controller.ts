import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user-role';
import { OrdersService } from './orders.service';

/** Màn hình quầy: chỉ nhân viên và admin. */
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN)
export class StaffController {
  constructor(private readonly orders: OrdersService) {}

  // GET /staff/orders — đơn cần xử lý (PAID, PREPARING, READY), cũ nhất trước
  @Get('orders')
  queue() {
    return this.orders.findQueue();
  }
}
