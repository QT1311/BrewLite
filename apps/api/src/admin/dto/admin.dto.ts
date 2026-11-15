import { IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
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
