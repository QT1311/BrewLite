import { Product } from './api';
import { SizeCode, TOPPINGS } from './options';

export interface CartItem {
  key: string;
  productId: number;
  name: string;
  imageUrl: string | null;
  size: SizeCode | null;
  toppings: string[];
  unitPrice: number;
  quantity: number;
}

export const MAX_QTY = 20;

/** Đơn giá = giá theo size của món (hoặc giá cố định nếu 1 cỡ) + tổng giá topping (FR-03). */
export function unitPrice(
  product: Pick<Product, 'price' | 'sizePrices'>,
  size: SizeCode | null,
  toppings: string[],
): number {
  const base = product.sizePrices && size ? (product.sizePrices[size] ?? product.price) : product.price;
  const toppingSum = toppings.reduce(
    (sum, code) => sum + (TOPPINGS.find((t) => t.code === code)?.price ?? 0),
    0,
  );
  return base + toppingSum;
}

export function lineKey(productId: number, size: SizeCode | null, toppings: string[]): string {
  return `${productId}|${size ?? '-'}|${[...toppings].sort().join(',')}`;
}

export function addItem(
  items: CartItem[],
  product: Product,
  size: SizeCode | null,
  toppings: string[],
  quantity = 1,
): CartItem[] {
  const key = lineKey(product.id, size, toppings);
  const existing = items.find((i) => i.key === key);
  if (existing) {
    return items.map((i) =>
      i.key === key ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i,
    );
  }
  return [
    ...items,
    {
      key,
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppings: [...toppings].sort(),
      unitPrice: unitPrice(product, size, toppings),
      quantity: Math.min(MAX_QTY, quantity),
    },
  ];
}

/** Số lượng <= 0 thì xoá dòng (FR-05). */
export function setQuantity(items: CartItem[], key: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeItem(items, key);
  return items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i));
}

export function removeItem(items: CartItem[], key: string): CartItem[] {
  return items.filter((i) => i.key !== key);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
