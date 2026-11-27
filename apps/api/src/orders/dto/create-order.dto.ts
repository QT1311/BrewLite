import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested,
} from 'class-validator';
import { SIZE_CODES, TOPPING_CODES } from '../../catalog/pricing';

export const PROMO_CODE_RE = /^\s*[A-Za-z0-9_-]{3,30}\s*$/;

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

  /** Mã khuyến mãi (tuỳ chọn); server kiểm tra và tự tính số tiền giảm (FR-18). */
  @IsOptional()
  @IsString()
  @Matches(PROMO_CODE_RE, { message: 'Mã khuyến mãi không hợp lệ' })
  promoCode?: string;
}

export class ApplyPromotionDto {
  @IsString()
  @Matches(PROMO_CODE_RE, { message: 'Mã khuyến mãi không hợp lệ' })
  code: string;
}

export class UpdateStatusDto {
  @IsIn(['PREPARING', 'READY', 'COMPLETED'], { message: 'Trạng thái không hợp lệ' })
  status: 'PREPARING' | 'READY' | 'COMPLETED';
}
