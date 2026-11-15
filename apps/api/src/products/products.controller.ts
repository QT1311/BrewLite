import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // GET /products — danh sách menu (FR-01)
  @Get()
  findAll() {
    return this.products.findAll();
  }

  // GET /products/:id — chi tiết sản phẩm (FR-02)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }
}
