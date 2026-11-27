import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user-role';
import { ApplyPromotionDto, CreateOrderDto, UpdateStatusDto } from './dto/create-order.dto';
import { OrderStatus } from './order-status';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    return this.orders.create(req.user!.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: AuthedRequest) {
    return this.orders.findMine(req.user!.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  one(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.findForUser(req.user!.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  cancel(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.cancel(req.user!.id, id);
  }

  @Post(':id/promotion')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  applyPromotion(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: ApplyPromotionDto) {
    return this.orders.applyPromotion(req.user!.id, id, dto.code);
  }

  @Delete(':id/promotion')
  @UseGuards(JwtAuthGuard)
  removePromotion(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.removePromotion(req.user!.id, id);
  }

  @Post(':id/points')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  redeemPoints(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.redeemPoints(req.user!.id, id);
  }

  @Delete(':id/points')
  @UseGuards(JwtAuthGuard)
  removePoints(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.orders.removePoints(req.user!.id, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  advance(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.orders.advance(id, dto.status as OrderStatus);
  }
}
