import { MIN_PAYABLE } from '../common/money';
import { DiscountType, Promotion } from './promotion.entity';

export { MIN_PAYABLE };
export const MAX_PERCENT = 90;

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Số tiền được giảm cho `subtotal` (đồng). Luôn nằm trong [0, subtotal − MIN_PAYABLE]. */
export function computeDiscount(
  p: Pick<Promotion, 'discountType' | 'value' | 'maxDiscount'>,
  subtotal: number,
): number {
  let discount = p.discountType === DiscountType.PERCENT ? Math.floor((subtotal * p.value) / 100) : p.value;
  if (p.maxDiscount != null) discount = Math.min(discount, p.maxDiscount);
  discount = Math.min(discount, Math.max(subtotal - MIN_PAYABLE, 0));
  return Math.max(discount, 0);
}

/** Trả về lý do mã không dùng được, hoặc null nếu hợp lệ. */
export function checkEligibility(
  p: Pick<Promotion, 'isActive' | 'expiresAt' | 'maxUses' | 'usedCount' | 'minOrderTotal'>,
  subtotal: number,
  now: Date = new Date(),
): string | null {
  if (!p.isActive) return 'Mã khuyến mãi không còn hiệu lực';
  if (p.expiresAt && p.expiresAt.getTime() <= now.getTime()) return 'Mã khuyến mãi đã hết hạn';
  if (p.maxUses != null && p.usedCount >= p.maxUses) return 'Mã khuyến mãi đã hết lượt sử dụng';
  if (subtotal < p.minOrderTotal) {
    return `Đơn tối thiểu ${p.minOrderTotal.toLocaleString('vi-VN')}đ mới dùng được mã này`;
  }
  return null;
}
