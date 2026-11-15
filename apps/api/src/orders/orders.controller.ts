import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffKeyGuard } from '../common/staff-key.guard';
import { CreateOrderDto, UpdateStatusDto } from './dto/create-order.dto';
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

  @Patch(':id/status')
  @UseGuards(StaffKeyGuard)
  advance(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.orders.advance(id, dto.status as OrderStatus);
  }
}
