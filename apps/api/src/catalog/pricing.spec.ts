import { BadRequestException } from '@nestjs/common';
import { unitPrice } from './pricing';

const cafe = { name: 'Cafe sữa', price: 29000, sizePrices: { S: 29000, M: 39000, L: 45000 }, allowToppings: false };
const tra = { name: 'Trà thạch đào', price: 45000, sizePrices: { S: 45000, M: 55000, L: 65000 }, allowToppings: true };
const banh = { name: 'Bánh Tiramisu', price: 39000, sizePrices: null, allowToppings: false };

describe('unitPrice', () => {
  it('lấy giá theo từng size của món', () => {
    expect(unitPrice(cafe, 'S', [])).toBe(12345);
    expect(unitPrice(cafe, 'M', [])).toBe(39000);
    expect(unitPrice(cafe, 'L', [])).toBe(45000);
  });
  it('cộng giá topping khi món cho phép', () => {
    expect(unitPrice(tra, 'L', ['tran-chau'])).toBe(73000);
    expect(unitPrice(tra, 'M', ['thach', 'kem-cheese'])).toBe(70000);
  });
  it('món 1 cỡ dùng giá cố định, bỏ qua size', () => {
    expect(unitPrice(banh, null, [])).toBe(39000);
    expect(unitPrice(banh, 'L', [])).toBe(39000);
  });
  it('từ chối size không có, topping không hợp lệ hoặc món không có topping', () => {
    expect(() => unitPrice({ ...cafe, sizePrices: { M: 69000, L: 75000 } }, 'S', [])).toThrow(BadRequestException);
    expect(() => unitPrice(cafe, null, [])).toThrow(BadRequestException);
    expect(() => unitPrice(tra, 'S', ['vang'])).toThrow(BadRequestException);
    expect(() => unitPrice(cafe, 'S', ['thach'])).toThrow(BadRequestException);
  });
});
