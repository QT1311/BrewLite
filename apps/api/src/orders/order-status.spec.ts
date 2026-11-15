import { ConflictException } from '@nestjs/common';
import { assertTransition, canTransition, OrderStatus as S } from './order-status';

describe('Order state machine', () => {
  it.each([
    [S.PENDING, S.PAID],
    [S.PENDING, S.PAYMENT_FAILED],
    [S.PENDING, S.CANCELLED],
    [S.PAYMENT_FAILED, S.PAID],
    [S.PAYMENT_FAILED, S.CANCELLED],
    [S.PAID, S.PREPARING],
    [S.PREPARING, S.READY],
    [S.READY, S.COMPLETED],
  ])('cho phép %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    [S.COMPLETED, S.PENDING],
    [S.PAID, S.PENDING],
    [S.PAID, S.CANCELLED],
    [S.PAID, S.COMPLETED],
    [S.CANCELLED, S.PAID],
    [S.PENDING, S.PREPARING],
    [S.READY, S.PREPARING],
  ])('chặn %s → %s', (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(ConflictException);
  });

  it('trạng thái cuối không có bước tiếp theo', () => {
    for (const to of Object.values(S)) {
      expect(canTransition(S.COMPLETED, to)).toBe(false);
      expect(canTransition(S.CANCELLED, to)).toBe(false);
    }
  });
});
