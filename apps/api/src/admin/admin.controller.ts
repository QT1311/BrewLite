import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrderStatus } from '../orders/order-status';
import { OrdersService } from '../orders/orders.service';
import { UserRole } from '../users/user-role';
import { AdminService, STATUS_VALUES } from './admin.service';
import { CreateStaffDto, RevenueQueryDto, UpdateProductDto, UpdateStaffDto } from './dto/admin.dto';

/** Khu quản trị: chỉ admin. */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orders: OrdersService,
  ) {}

  @Get('stats/revenue')
  revenue(@Query() q: RevenueQueryDto) {
    return this.admin.revenue(q.days ?? 7);
  }

  @Get('orders')
  allOrders(@Query('status') status?: string) {
    if (status && !STATUS_VALUES.includes(status as OrderStatus)) throw new BadRequestException('Trạng thái không hợp lệ');
    return this.orders.findAllForAdmin(status as OrderStatus | undefined);
  }

  @Get('products')
  products() {
    return this.admin.listProducts();
  }

  @Patch('products/:id')
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.admin.updateProduct(id, dto);
  }

  @Get('staff')
  staff() {
    return this.admin.listStaff();
  }

  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.admin.createStaff(dto);
  }

  @Patch('staff/:id')
  setStaffActive(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStaffDto) {
    return this.admin.setStaffActive(id, dto.isActive);
  }
}
