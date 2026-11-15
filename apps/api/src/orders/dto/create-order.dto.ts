import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, Max, Min, ValidateNested,
} from 'class-validator';
import { SIZE_CODES, TOPPING_CODES } from '../../catalog/pricing';

export class OrderItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsOptional()
  @IsIn(SIZE_CODES, { message: 'Size phải là S, M hoặc L' })
  size?: (typeof SIZE_CODES)[number];

  @IsArray()
  @ArrayMaxSize(TOPPING_CODES.length)
  @IsIn(TOPPING_CODES, { each: true, message: 'Topping không hợp lệ' })
  toppings: string[];

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 món' })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateStatusDto {
  @IsIn(['PREPARING', 'READY', 'COMPLETED'], { message: 'Trạng thái không hợp lệ' })
  status: 'PREPARING' | 'READY' | 'COMPLETED';
}
