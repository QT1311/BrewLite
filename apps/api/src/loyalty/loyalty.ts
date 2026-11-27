import { MIN_PAYABLE } from '../common/money';

/** Quy tắc tích điểm: mỗi 10.000đ thực trả (sau mọi khoản giảm) được 1 điểm, làm tròn xuống. */
export const VND_PER_POINT = 10000;

export function pointsForTotal(total: number): number {
  return Math.max(Math.floor(total / VND_PER_POINT), 0);
}

/** Quy tắc đổi điểm: 1 điểm = 100đ giảm giá. */
export const VND_PER_REDEEM_POINT = 100;

/** Khách phải có ít nhất số điểm này (tương đương 10.000đ) mới được đổi điểm. */
export const MIN_REDEEM_POINTS = 100;

export function pointsToVnd(points: number): number {
  return points * VND_PER_REDEEM_POINT;
}

/**
 * Số điểm sẽ dùng cho đơn: tối đa bằng số dư, nhưng không làm số tiền phải trả thấp hơn MIN_PAYABLE.
 * `payable` là số tiền của đơn sau khi đã trừ mã khuyến mãi.
 */
export function redeemablePoints(balance: number, payable: number): number {
  const byOrder = Math.floor(Math.max(payable - MIN_PAYABLE, 0) / VND_PER_REDEEM_POINT);
  return Math.max(Math.min(balance, byOrder), 0);
}
