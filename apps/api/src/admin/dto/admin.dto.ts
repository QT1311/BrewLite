import {
  IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { DiscountType } from '../../promotions/promotion.entity';
import { Type } from 'class-transformer';

export class CreateStaffDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @MaxLength(60)
  name: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  password: string;
}

export class UpdateStaffDto {
  @IsBoolean({ message: 'isActive phải là true hoặc false' })
  isActive: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsInt({ message: 'Tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  @Max(100000)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RevenueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30])
  days?: number;
}

export class CreatePromotionDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, { message: 'Mã gồm 3–30 ký tự chữ, số, - hoặc _' })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsIn(Object.values(DiscountType), { message: 'Loại giảm giá phải là PERCENT hoặc FIXED' })
  discountType: DiscountType;

  @IsInt({ message: 'Giá trị giảm phải là số nguyên' })
  @Min(1, { message: 'Giá trị giảm phải lớn hơn 0' })
  @Max(10000000)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Hạn dùng phải là ngày hợp lệ (ISO 8601)' })
  expiresAt?: string;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** null = bỏ giới hạn lượt dùng. */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  /** null = bỏ hạn dùng. */
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
