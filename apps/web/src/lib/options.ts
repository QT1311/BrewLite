export type SizeCode = 'S' | 'M' | 'L';

// Giá từng size nằm ở dữ liệu sản phẩm (sizePrices), ở đây chỉ giữ nhãn hiển thị.
export const SIZES: { code: SizeCode; label: string }[] = [
  { code: 'S', label: 'Size S' },
  { code: 'M', label: 'Size M' },
  { code: 'L', label: 'Size L' },
];

export const TOPPINGS: { code: string; label: string; price: number }[] = [
  { code: 'tran-chau', label: 'Trân châu', price: 8000 },
  { code: 'thach', label: 'Thạch trái cây', price: 5000 },
  { code: 'kem-cheese', label: 'Kem cheese', price: 10000 },
];

/** Các size mà món cung cấp, theo thứ tự S → M → L. Rỗng nếu món chỉ có 1 cỡ. */
export function availableSizes(sizePrices?: Record<string, number> | null): SizeCode[] {
  if (!sizePrices) return [];
  return SIZES.map((s) => s.code).filter((c) => sizePrices[c] !== undefined);
}
