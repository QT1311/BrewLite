import { MIN_REDEEM_POINTS, pointsForTotal, pointsToVnd, redeemablePoints } from './loyalty';

describe('pointsForTotal', () => {
  it('1 điểm cho mỗi 10.000đ, làm tròn xuống', () => {
    expect(pointsForTotal(9999)).toBe(0);
    expect(pointsForTotal(10000)).toBe(1);
    expect(pointsForTotal(53000 * 2)).toBe(10);
  });
  it('không âm', () => {
    expect(pointsForTotal(-5)).toBe(0);
  });
});

describe('đổi điểm', () => {
  it('1 điểm = 100đ và cần tối thiểu 100 điểm (10.000đ)', () => {
    expect(pointsToVnd(1)).toBe(100);
    expect(pointsToVnd(MIN_REDEEM_POINTS)).toBe(10000);
  });
  it('dùng hết số dư nếu đơn đủ lớn', () => {
    expect(redeemablePoints(250, 100000)).toBe(250);
  });
  it('bị giới hạn để đơn còn trả tối thiểu 1.000đ', () => {
    expect(redeemablePoints(5000, 30000)).toBe(290); // (30.000 − 1.000) / 100
    expect(redeemablePoints(5000, 1000)).toBe(0);
    expect(redeemablePoints(5000, 500)).toBe(0);
  });
  it('không âm khi hết điểm', () => {
    expect(redeemablePoints(0, 50000)).toBe(0);
  });
});
