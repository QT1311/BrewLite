import { checkEligibility, computeDiscount, normalizeCode } from './promotion';
import { DiscountType } from './promotion.entity';

const pct = (value: number, maxDiscount: number | null = null) => ({ discountType: DiscountType.PERCENT, value, maxDiscount });
const fixed = (value: number) => ({ discountType: DiscountType.FIXED, value, maxDiscount: null });

describe('computeDiscount', () => {
  it('giảm theo phần trăm, làm tròn xuống', () => {
    expect(computeDiscount(pct(10), 53000)).toBe(5300);
    expect(computeDiscount(pct(15), 33333)).toBe(4999);
  });
  it('phần trăm bị chặn bởi mức giảm tối đa', () => {
    expect(computeDiscount(pct(10, 20000), 400000)).toBe(20000);
    expect(computeDiscount(pct(10, 20000), 100000)).toBe(10000);
  });
  it('giảm số tiền cố định', () => {
    expect(computeDiscount(fixed(15000), 80000)).toBe(15000);
  });
  it('không bao giờ làm đơn thấp hơn mức thanh toán tối thiểu', () => {
    expect(computeDiscount(fixed(50000), 30000)).toBe(29000);
    expect(computeDiscount(fixed(50000), 1000)).toBe(0);
  });
});

describe('checkEligibility', () => {
  const ok = { isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minOrderTotal: 0 };
  const now = new Date('2026-11-16T00:00:00Z');

  it('mã hợp lệ', () => {
    expect(checkEligibility(ok, 50000, now)).toBeNull();
  });
  it('mã bị tắt', () => {
    expect(checkEligibility({ ...ok, isActive: false }, 50000, now)).toMatch(/không còn hiệu lực/);
  });
  it('mã hết hạn', () => {
    expect(checkEligibility({ ...ok, expiresAt: new Date('2026-11-15T00:00:00Z') }, 50000, now)).toMatch(/hết hạn/);
    expect(checkEligibility({ ...ok, expiresAt: new Date('2026-11-17T00:00:00Z') }, 50000, now)).toBeNull();
  });
  it('hết lượt dùng', () => {
    expect(checkEligibility({ ...ok, maxUses: 5, usedCount: 5 }, 50000, now)).toMatch(/hết lượt/);
    expect(checkEligibility({ ...ok, maxUses: 5, usedCount: 4 }, 50000, now)).toBeNull();
  });
  it('chưa đạt giá trị đơn tối thiểu', () => {
    expect(checkEligibility({ ...ok, minOrderTotal: 60000 }, 50000, now)).toMatch(/tối thiểu 60\.000đ/);
    expect(checkEligibility({ ...ok, minOrderTotal: 60000 }, 60000, now)).toBeNull();
  });
});

describe('normalizeCode', () => {
  it('cắt khoảng trắng và viết hoa', () => {
    expect(normalizeCode('  brew10 ')).toBe('BREW10');
  });
});
