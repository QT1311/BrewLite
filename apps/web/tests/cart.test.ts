import { addItem, cartCount, cartTotal, lineKey, removeItem, setQuantity, unitPrice, MAX_QTY } from '@/lib/cart';

const cafe = { id: 1, name: 'Cà phê sữa', description: '', price: 35000, imageUrl: null, category: 'ca-phe', stock: 10, sizePrices: { S: 35000, M: 40000, L: 45000 }, allowToppings: true };
const banh = { id: 9, name: 'Bánh Tiramisu', description: '', price: 39000, imageUrl: null, category: 'banh', stock: 5, sizePrices: null, allowToppings: false };

describe('unitPrice', () => {
  it('lấy giá theo từng size của món', () => {
    expect(unitPrice(cafe, 'S', [])).toBe(35000);
    expect(unitPrice(cafe, 'M', [])).toBe(40000);
    expect(unitPrice(cafe, 'L', [])).toBe(45000);
  });
  it('món 1 cỡ dùng giá cố định, không có size', () => {
    expect(unitPrice(banh, null, [])).toBe(39000);
    expect(addItem([], banh, null, [])[0]).toMatchObject({ size: null, unitPrice: 39000, key: '9|-|' });
  });
  it('cộng giá topping', () => {
    expect(unitPrice(cafe, 'M', ['tran-chau', 'kem-cheese'])).toBe(40000 + 8000 + 10000);
  });
});

describe('cart', () => {
  it('lineKey không phụ thuộc thứ tự topping', () => {
    expect(lineKey(1, 'M', ['thach', 'tran-chau'])).toBe(lineKey(1, 'M', ['tran-chau', 'thach']));
  });
  it('thêm cùng lựa chọn thì gộp số lượng, khác lựa chọn thì tách dòng', () => {
    let items = addItem([], cafe, 'M', ['thach']);
    items = addItem(items, cafe, 'M', ['thach']);
    items = addItem(items, cafe, 'L', []);
    expect(items).toHaveLength(2);
    expect(cartCount(items)).toBe(3);
  });
  it('tổng tiền = Σ đơn giá × số lượng', () => {
    let items = addItem([], cafe, 'M', [], 2); // 40.000 × 2
    items = addItem(items, cafe, 'L', ['thach']); // 50.000
    expect(cartTotal(items)).toBe(130000);
  });
  it('sửa số lượng; về 0 thì xoá dòng', () => {
    let items = addItem([], cafe, 'M', []);
    const key = items[0].key;
    items = setQuantity(items, key, 4);
    expect(items[0].quantity).toBe(4);
    expect(setQuantity(items, key, 0)).toHaveLength(0);
  });
  it('giới hạn số lượng tối đa', () => {
    const items = addItem([], cafe, 'M', [], 99);
    expect(items[0].quantity).toBe(MAX_QTY);
  });
  it('xoá dòng', () => {
    const items = addItem([], cafe, 'M', []);
    expect(removeItem(items, items[0].key)).toEqual([]);
  });
});
