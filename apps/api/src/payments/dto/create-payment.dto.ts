import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsIn(['EWALLET', 'CARD'], { message: 'Phương thức phải là EWALLET hoặc CARD' })
  method: 'EWALLET' | 'CARD';

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
