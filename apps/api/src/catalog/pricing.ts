/**
 * Bảng giá tuỳ chọn — nguồn sự thật ở phía server.
 * Frontend chỉ hiển thị; khi tạo đơn, API luôn tính lại giá từ dữ liệu sản phẩm
 * nên client không thể tự sửa giá.
 */
import { BadRequestException } from '@nestjs/common';

export const SIZE_CODES = ['S', 'M', 'L'] as const;
export type SizeCode = (typeof SIZE_CODES)[number];

export const TOPPING_PRICES: Record<string, number> = {
  'tran-chau': 8000,
  thach: 5000,
  'kem-cheese': 10000,
};
export const TOPPING_CODES = Object.keys(TOPPING_PRICES);

export interface Priceable {
  name?: string;
  price: number;
  sizePrices: Record<string, number> | null;
  allowToppings: boolean;
}

/**
 * Đơn giá = giá theo size của món (hoặc giá cố định nếu món chỉ có 1 cỡ) + tổng topping.
 * Ném BadRequestException nếu size/topping không áp dụng cho món này.
 */
export function unitPrice(p: Priceable, size: SizeCode | null | undefined, toppings: string[]): number {
  let base = p.price;
  if (p.sizePrices) {
    const bySize = size ? p.sizePrices[size] : undefined;
    if (bySize === undefined) {
      throw new BadRequestException(`"${p.name ?? 'Món này'}" không có size ${size ?? '(trống)'}`);
    }
    base = bySize;
  }
  if (toppings.length > 0 && !p.allowToppings) {
    throw new BadRequestException(`"${p.name ?? 'Món này'}" không có topping`);
  }
  const toppingSum = toppings.reduce((sum, code) => {
    const price = TOPPING_PRICES[code];
    if (price === undefined) throw new BadRequestException(`Topping không hợp lệ: ${code}`);
    return sum + price;
  }, 0);
  return base + toppingSum;
}
