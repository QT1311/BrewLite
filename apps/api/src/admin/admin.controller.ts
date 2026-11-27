import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MAX_PERCENT } from '../promotions/promotion';
import { DiscountType } from '../promotions/promotion.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { OrderStatus } from '../orders/order-status';
import { OrdersService } from '../orders/orders.service';
import { UserRole } from '../users/user-role';
import { AdminService, STATUS_VALUES } from './admin.service';
import {
  CreatePromotionDto, CreateStaffDto, RevenueQueryDto, UpdateProductDto, UpdatePromotionDto, UpdateStaffDto,
} from './dto/admin.dto';

/** Khu quản trị: chỉ admin. */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orders: OrdersService,
    private readonly promotions: PromotionsService,
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

  @Get('promotions')
  listPromotions() {
    return this.promotions.list();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    if (dto.discountType === DiscountType.PERCENT && dto.value > MAX_PERCENT) {
      throw new BadRequestException(`Giảm theo phần trăm tối đa ${MAX_PERCENT}%`);
    }
    return this.promotions.create(dto);
  }

  @Patch('promotions/:id')
  updatePromotion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(id, dto);
  }
}
