/**
 * Integration test (Task 5.2) cho luồng đặt đơn & thanh toán, chạy trên PostgreSQL thật.
 * Yêu cầu: PostgreSQL đang chạy với cấu hình trong .env (giống khi chạy dev).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../app.module';
import { Product } from '../products/product.entity';
import * as bcrypt from 'bcryptjs';
import { LoyaltyTransaction } from '../loyalty/loyalty-transaction.entity';
import { DiscountType, Promotion } from '../promotions/promotion.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';

describe('Orders & Payments (integration)', () => {
  let app: INestApplication;
  let db: DataSource;
  const createdUsers: string[] = [];
  const createdProducts: number[] = [];
  const createdPromos: number[] = [];

  const http = () => request(app.getHttpServer());

  async function newUser(): Promise<string> {
    const email = `it-${randomUUID()}@test.local`;
    createdUsers.push(email);
    const res = await http().post('/auth/register').send({ email, name: 'Tester', password: 'matkhau123' }).expect(201);
    return res.body.accessToken;
  }

  /** Tạo tài khoản có vai trò (staff/admin) trực tiếp trong CSDL rồi đăng nhập lấy token. */
  async function newRoleUser(role: UserRole): Promise<{ token: string; id: number; email: string }> {
    const email = `it-${role}-${randomUUID()}@test.local`;
    createdUsers.push(email);
    const user = await db
      .getRepository(User)
      .save({ email, name: `IT ${role}`, passwordHash: await bcrypt.hash('matkhau123', 4), role, isActive: true });
    const res = await http().post('/auth/login').send({ email, password: 'matkhau123' }).expect(200);
    return { token: res.body.accessToken, id: user.id, email };
  }

  async function newProduct(
    stock: number,
    price = 30000,
    extra: Partial<Pick<Product, 'sizePrices' | 'allowToppings'>> = {},
  ): Promise<number> {
    const p = await db
      .getRepository(Product)
      .save({ name: `IT product ${randomUUID().slice(0, 8)}`, price, stock, category: 'test', ...extra });
    createdProducts.push(p.id);
    return p.id;
  }

  /** Tạo mã khuyến mãi riêng cho từng test (mã ngẫu nhiên, dọn ở afterAll). */
  async function newPromo(extra: Partial<Promotion> = {}): Promise<Promotion> {
    const p = await db.getRepository(Promotion).save({
      code: `IT${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      description: 'mã test',
      discountType: DiscountType.PERCENT,
      value: 10,
      minOrderTotal: 0,
      maxDiscount: null,
      maxUses: null,
      expiresAt: null,
      isActive: true,
      ...extra,
    });
    createdPromos.push(p.id);
    return p;
  }
  const usedCount = async (id: number) => (await db.getRepository(Promotion).findOneByOrFail({ id })).usedCount;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Khách mới có sẵn `points` điểm (ghi thẳng vào CSDL để không phải mua hàng hàng triệu đồng). */
  async function newUserWithPoints(points: number): Promise<{ token: string; id: number }> {
    const token = await newUser();
    const me = await http().get('/auth/me').set(auth(token)).expect(200);
    await db.getRepository(User).update({ id: me.body.id }, { loyaltyPoints: points });
    return { token, id: me.body.id };
  }
  const balanceOf = async (userId: number) => (await db.getRepository(User).findOneByOrFail({ id: userId })).loyaltyPoints;
  const placeOrder = async (token: string, productId: number, quantity: number) =>
    (await http().post('/orders').set(auth(token)).send({ items: [{ productId, size: 'S', toppings: [], quantity }] }).expect(201)).body;

  const order = (token: string, productId: number, quantity = 1, extra: object = {}) =>
    http()
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, size: 'S', toppings: [], quantity, ...extra }] });

  const pay = (token: string, orderId: number, key: string, body: object = {}) =>
    http()
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ orderId, method: 'EWALLET', ...body });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0); // cổng ngẫu nhiên, tránh mở lại server cho mỗi request
    db = app.get(DataSource);
  });

  afterAll(async () => {
    if (db) {
      // Xoá user → cascade xoá orders, order_items, payments.
      await db.getRepository(User).delete({ email: In(createdUsers) });
      if (createdProducts.length) await db.getRepository(Product).delete(createdProducts);
      if (createdPromos.length) await db.getRepository(Promotion).delete(createdPromos);
    }
    await app?.close();
  });

  it('INT-T01: tạo đơn cần đăng nhập (401)', async () => {
    await http().post('/orders').send({ items: [] }).expect(401);
  });

  it('INT-T02: server tự tính giá, bỏ qua giá client gửi lên', async () => {
    const token = await newUser();
    const pid = await newProduct(10, 35000, { sizePrices: { S: 35000, M: 40000, L: 45000 }, allowToppings: true });
    const res = await http()
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: pid, size: 'L', toppings: ['tran-chau'], quantity: 2, unitPrice: 1 }], total: 1 })
      .expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.items[0].unitPrice).toBe(45000 + 8000);
    expect(res.body.total).toBe(53000 * 2);
    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(8);
  });

  it('INT-T03: dữ liệu sai → 400', async () => {
    const token = await newUser();
    const pid = await newProduct(5);
    await order(token, pid, 0).expect(400);
    await order(token, pid, 1, { size: 'XL' }).expect(400);
    await order(token, pid, 1, { toppings: ['vang'] }).expect(400);
    // món không cho topping → 400, và size không tồn tại với món có sizePrices → 400
    await order(token, pid, 1, { toppings: ['thach'] }).expect(400);
    const sized = await newProduct(5, 45000, { sizePrices: { M: 69000, L: 75000 } });
    await order(token, sized, 1, { size: 'S' }).expect(400);
    await order(token, sized, 1, { size: 'M' }).expect(201);
  });

  it('INT-T04: 2 đơn đồng thời tranh 1 sản phẩm cuối cùng → chỉ 1 thành công (FR-17)', async () => {
    const [a, b] = await Promise.all([newUser(), newUser()]);
    const pid = await newProduct(1);
    const results = await Promise.all([order(a, pid), order(b, pid)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(0);
  });

  it('INT-T05: 10 đơn đồng thời, tồn kho 3 → đúng 3 đơn thành công, không âm kho', async () => {
    const tokens = await Promise.all(Array.from({ length: 10 }, () => newUser()));
    const pid = await newProduct(3);
    const results = await Promise.all(tokens.map((t) => order(t, pid)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);
    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(0);
  });

  it('INT-T06: thanh toán lặp cùng Idempotency-Key chỉ tạo 1 giao dịch (FR-13)', async () => {
    const token = await newUser();
    const pid = await newProduct(5);
    const { body: o } = await order(token, pid).expect(201);
    const key = `k-${randomUUID()}`;
    const [r1, r2, r3] = await Promise.all([pay(token, o.id, key), pay(token, o.id, key), pay(token, o.id, key)]);
    for (const r of [r1, r2, r3]) {
      expect(r.status).toBe(201);
      expect(r.body.paymentId).toBe(r1.body.paymentId);
      expect(r.body.orderStatus).toBe('PAID');
    }
    const count = await db.query('SELECT COUNT(*)::int AS n FROM payments WHERE order_id = $1', [o.id]);
    expect(count[0].n).toBe(1);
  });

  it('INT-T07: đơn đã PAID không thể thanh toán lần nữa bằng key khác (409)', async () => {
    const token = await newUser();
    const pid = await newProduct(5);
    const { body: o } = await order(token, pid).expect(201);
    await pay(token, o.id, `k-${randomUUID()}`).expect(201);
    await pay(token, o.id, `k-${randomUUID()}`).expect(409);
  });

  it('INT-T08: thanh toán thất bại → PAYMENT_FAILED, thử lại thành công → PAID (FR-12)', async () => {
    const token = await newUser();
    const pid = await newProduct(5);
    const { body: o } = await order(token, pid).expect(201);
    const fail = await pay(token, o.id, `k-${randomUUID()}`, { simulateFailure: true, method: 'CARD' }).expect(201);
    expect(fail.body.status).toBe('FAILED');
    expect(fail.body.orderStatus).toBe('PAYMENT_FAILED');
    const ok = await pay(token, o.id, `k-${randomUUID()}`).expect(201);
    expect(ok.body.orderStatus).toBe('PAID');
  });

  it('INT-T09: thiếu Idempotency-Key → 400; dùng lại key cho đơn khác → 422', async () => {
    const token = await newUser();
    const pid = await newProduct(5);
    const { body: o1 } = await order(token, pid).expect(201);
    const { body: o2 } = await order(token, pid).expect(201);
    await http().post('/payments').set('Authorization', `Bearer ${token}`).send({ orderId: o1.id, method: 'EWALLET' }).expect(400);
    const key = `k-${randomUUID()}`;
    await pay(token, o1.id, key).expect(201);
    await pay(token, o2.id, key).expect(422);
  });

  it('INT-T10: không xem/thanh toán được đơn của người khác (404)', async () => {
    const [owner, other] = await Promise.all([newUser(), newUser()]);
    const pid = await newProduct(5);
    const { body: o } = await order(owner, pid).expect(201);
    await http().get(`/orders/${o.id}`).set('Authorization', `Bearer ${other}`).expect(404);
    await pay(other, o.id, `k-${randomUUID()}`).expect(404);
    const mine = await http().get('/orders/me').set('Authorization', `Bearer ${other}`).expect(200);
    expect(mine.body).toEqual([]);
  });

  it('INT-T11: huỷ đơn chưa thanh toán sẽ hoàn kho; đơn đã PAID không huỷ được', async () => {
    const token = await newUser();
    const pid = await newProduct(4);
    const { body: o } = await order(token, pid, 3).expect(201);
    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(1);
    const c = await http().post(`/orders/${o.id}/cancel`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(c.body.status).toBe('CANCELLED');
    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(4);

    const { body: paid } = await order(token, pid).expect(201);
    await pay(token, paid.id, `k-${randomUUID()}`).expect(201);
    await http().post(`/orders/${paid.id}/cancel`).set('Authorization', `Bearer ${token}`).expect(409);
  });

  it('INT-T12: nhân viên cập nhật trạng thái theo đúng máy trạng thái (FR-16)', async () => {
    const token = await newUser();
    const staffToken = (await newRoleUser(UserRole.STAFF)).token;
    const pid = await newProduct(5);
    const { body: o } = await order(token, pid).expect(201);
    const staff = (status: string, bearer = staffToken) =>
      http().patch(`/orders/${o.id}/status`).set('Authorization', `Bearer ${bearer}`).send({ status });

    await staff('PREPARING', token).expect(403); // khách hàng không có quyền
    await http().patch(`/orders/${o.id}/status`).send({ status: 'PREPARING' }).expect(401); // không token
    await staff('PREPARING').expect(409); // PENDING → PREPARING không hợp lệ
    await pay(token, o.id, `k-${randomUUID()}`).expect(201);
    await staff('COMPLETED').expect(409); // PAID → COMPLETED nhảy cóc
    await staff('PREPARING').expect(200);
    await staff('READY').expect(200);
    const done = await staff('COMPLETED').expect(200);
    expect(done.body.status).toBe('COMPLETED');
    await staff('PREPARING').expect(409); // không quay lui
  });

  it('INT-T13: staff thấy hàng đợi đơn đã thanh toán kèm tên khách; khách và người ngoài bị chặn', async () => {
    const customer = await newUser();
    const staff = await newRoleUser(UserRole.STAFF);
    const pid = await newProduct(5);
    const { body: paid } = await order(customer, pid).expect(201);
    const { body: unpaid } = await order(customer, pid).expect(201);
    await pay(customer, paid.id, `k-${randomUUID()}`).expect(201);

    const res = await http().get('/staff/orders').set('Authorization', `Bearer ${staff.token}`).expect(200);
    const ids = res.body.map((o: { id: number }) => o.id);
    expect(ids).toContain(paid.id);
    expect(ids).not.toContain(unpaid.id); // chưa thanh toán thì quầy chưa thấy
    const row = res.body.find((o: { id: number }) => o.id === paid.id);
    expect(row.customerName).toBe('Tester');
    expect(row.items[0].quantity).toBe(1);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash/);

    await http().get('/staff/orders').set('Authorization', `Bearer ${customer}`).expect(403);
    await http().get('/staff/orders').expect(401);
  });

  it('INT-T14: admin xem mọi đơn; staff và khách không vào được khu admin', async () => {
    const customer = await newUser();
    const staff = await newRoleUser(UserRole.STAFF);
    const admin = await newRoleUser(UserRole.ADMIN);
    const pid = await newProduct(5);
    const { body: o } = await order(customer, pid).expect(201);

    const all = await http().get('/admin/orders').set('Authorization', `Bearer ${admin.token}`).expect(200);
    const row = all.body.find((x: { id: number }) => x.id === o.id);
    expect(row.customerEmail).toMatch(/@test\.local$/);
    await http().get('/admin/orders?status=KHONG_CO').set('Authorization', `Bearer ${admin.token}`).expect(400);
    for (const path of ['/admin/orders', '/admin/stats/revenue', '/admin/products', '/admin/staff']) {
      await http().get(path).set('Authorization', `Bearer ${staff.token}`).expect(403);
      await http().get(path).set('Authorization', `Bearer ${customer}`).expect(403);
      await http().get(path).expect(401);
    }
  });

  it('INT-T15: doanh thu chỉ tính giao dịch thành công, không tính đơn chưa trả hoặc thanh toán lỗi', async () => {
    const customer = await newUser();
    const admin = await newRoleUser(UserRole.ADMIN);
    const get = async () =>
      (await http().get('/admin/stats/revenue?days=7').set('Authorization', `Bearer ${admin.token}`).expect(200)).body;
    const before = await get();

    const pid = await newProduct(10, 40000);
    const { body: ok } = await order(customer, pid, 2).expect(201); // 2 × 40.000 = 80.000
    await pay(customer, ok.id, `k-${randomUUID()}`).expect(201);
    const { body: bad } = await order(customer, pid).expect(201);
    await pay(customer, bad.id, `k-${randomUUID()}`, { simulateFailure: true }); // thanh toán lỗi
    await order(customer, pid).expect(201); // đơn chưa thanh toán

    const after = await get();
    expect(after.totalRevenue - before.totalRevenue).toBe(ok.total);
    expect(after.orderCount - before.orderCount).toBe(1);
    expect(after.byDay).toHaveLength(7);
    expect(after.today.revenue - before.today.revenue).toBe(ok.total);
    await http().get('/admin/stats/revenue?days=5').set('Authorization', `Bearer ${admin.token}`).expect(400);
  });

  it('INT-T16: admin sửa tồn kho; món ngưng bán ẩn khỏi menu và không đặt được', async () => {
    const customer = await newUser();
    const admin = await newRoleUser(UserRole.ADMIN);
    const pid = await newProduct(3);
    const auth = { Authorization: `Bearer ${admin.token}` };

    const upd = await http().patch(`/admin/products/${pid}`).set(auth).send({ stock: 9 }).expect(200);
    expect(upd.body.stock).toBe(9);
    await http().patch(`/admin/products/${pid}`).set(auth).send({ stock: -1 }).expect(400);
    await http().patch('/admin/products/99999999').set(auth).send({ stock: 1 }).expect(404);

    await http().patch(`/admin/products/${pid}`).set(auth).send({ isActive: false }).expect(200);
    await order(customer, pid).expect(409); // đang ngưng bán
    await http().patch(`/admin/products/${pid}`).set(auth).send({ isActive: true }).expect(200);
    await order(customer, pid).expect(201);
  });

  it('INT-T17: admin tạo và khoá staff; staff bị khoá mất quyền ngay; đăng ký công khai không tự lên quyền', async () => {
    const admin = await newRoleUser(UserRole.ADMIN);
    const auth = { Authorization: `Bearer ${admin.token}` };
    const email = `it-newstaff-${randomUUID()}@test.local`;
    createdUsers.push(email);

    const created = await http().post('/admin/staff').set(auth).send({ email, name: 'Quầy 1', password: 'matkhau123' }).expect(201);
    expect(created.body).not.toHaveProperty('passwordHash');
    await http().post('/admin/staff').set(auth).send({ email, name: 'Quầy 1', password: 'matkhau123' }).expect(409);
    await http().post('/admin/staff').set(auth).send({ email: 'x@test.local', name: 'X', password: '123' }).expect(400);

    const login = await http().post('/auth/login').send({ email, password: 'matkhau123' }).expect(200);
    expect(login.body.user.role).toBe('staff');
    const staffAuth = { Authorization: `Bearer ${login.body.accessToken}` };
    await http().get('/staff/orders').set(staffAuth).expect(200);

    await http().patch(`/admin/staff/${created.body.id}`).set(auth).send({ isActive: false }).expect(200);
    await http().get('/staff/orders').set(staffAuth).expect(401); // token cũ mất hiệu lực
    await http().post('/auth/login').send({ email, password: 'matkhau123' }).expect(403);
    await http().patch(`/admin/staff/${admin.id}`).set(auth).send({ isActive: false }).expect(404); // không đụng được admin

    const regEmail = `it-reg-${randomUUID()}@test.local`;
    createdUsers.push(regEmail);
    const reg = await http().post('/auth/register').send({ email: regEmail, name: 'K', password: 'matkhau123', role: 'admin' }).expect(201);
    expect(reg.body.user.role).toBe('customer');
  });

  it('INT-T18: áp mã giảm giá khi tạo đơn; server tự tính tiền giảm, bỏ qua số client gửi (FR-18)', async () => {
    const token = await newUser();
    const pid = await newProduct(10, 50000);
    const promo = await newPromo({ value: 10, maxDiscount: 20000 });
    const res = await http().post('/orders').set(auth(token)).send({
      items: [{ productId: pid, size: 'S', toppings: [], quantity: 2 }],
      promoCode: ` ${promo.code.toLowerCase()} `,
      discountAmount: 99999,
      total: 1,
    }).expect(201);
    expect(res.body.promotionCode).toBe(promo.code);
    expect(res.body.discountAmount).toBe(10000); // 10% của 100.000đ
    expect(res.body.total).toBe(90000);
    expect(await usedCount(promo.id)).toBe(1);

    // mức giảm tối đa: 10% của 400.000đ = 40.000đ nhưng bị chặn ở 20.000đ
    const big = await http().post('/orders').set(auth(token)).send({
      items: [{ productId: pid, size: 'S', toppings: [], quantity: 4 }, { productId: pid, size: 'S', toppings: [], quantity: 4 }],
      promoCode: promo.code,
    }).expect(201);
    expect(big.body.discountAmount).toBe(20000);
    expect(big.body.total).toBe(400000 - 20000);
  });

  it('INT-T19: mã không hợp lệ (không tồn tại, bị tắt, hết hạn, chưa đủ đơn tối thiểu) → 422 và không giữ tồn kho', async () => {
    const token = await newUser();
    const pid = await newProduct(5, 30000);
    const inactive = await newPromo({ isActive: false });
    const expired = await newPromo({ expiresAt: new Date(Date.now() - 60_000) });
    const minimum = await newPromo({ minOrderTotal: 100000 });
    const sendWith = (code: string) =>
      http().post('/orders').set(auth(token)).send({ items: [{ productId: pid, size: 'S', toppings: [], quantity: 1 }], promoCode: code });

    await sendWith('KHONGTONTAI').expect(422);
    await sendWith(inactive.code).expect(422);
    expect((await sendWith(expired.code).expect(422)).body.message).toMatch(/hết hạn/);
    expect((await sendWith(minimum.code).expect(422)).body.message).toMatch(/tối thiểu/);
    await sendWith('a!').expect(400);

    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(5); // transaction rollback, không mất hàng
    expect(await usedCount(minimum.id)).toBe(0);
    await http().get('/orders/me').set(auth(token)).expect(200).expect((r) => expect(r.body).toHaveLength(0));
  });

  it('INT-T20: mã chỉ còn 1 lượt, 2 khách đặt cùng lúc → đúng 1 đơn được giảm giá', async () => {
    const [a, b] = [await newUser(), await newUser()];
    const pid = await newProduct(10, 40000);
    const promo = await newPromo({ maxUses: 1 });
    const results = await Promise.all(
      [a, b].map((t) =>
        http().post('/orders').set(auth(t)).send({ items: [{ productId: pid, size: 'S', toppings: [], quantity: 1 }], promoCode: promo.code }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(await usedCount(promo.id)).toBe(1);
    expect((await db.getRepository(Product).findOneBy({ id: pid }))!.stock).toBe(9); // đơn bị từ chối không giữ hàng
  });

  it('INT-T21: áp, đổi, gỡ mã trên đơn chưa thanh toán; đơn đã PAID hoặc của người khác bị chặn', async () => {
    const token = await newUser();
    const other = await newUser();
    const pid = await newProduct(10, 50000);
    const p1 = await newPromo({ discountType: DiscountType.FIXED, value: 5000 });
    const p2 = await newPromo({ value: 20 });
    const created = (await order(token, pid, 2).expect(201)).body; // 100.000đ
    const id = created.id;

    await http().post(`/orders/${id}/promotion`).set(auth(other)).send({ code: p1.code }).expect(404);
    const r1 = await http().post(`/orders/${id}/promotion`).set(auth(token)).send({ code: p1.code }).expect(200);
    expect(r1.body.total).toBe(95000);
    expect(await usedCount(p1.id)).toBe(1);

    const r2 = await http().post(`/orders/${id}/promotion`).set(auth(token)).send({ code: p2.code }).expect(200); // đổi mã
    expect(r2.body.total).toBe(80000);
    expect(r2.body.discountAmount).toBe(20000);
    expect(await usedCount(p1.id)).toBe(0); // mã cũ được trả lượt
    expect(await usedCount(p2.id)).toBe(1);

    const r3 = await http().delete(`/orders/${id}/promotion`).set(auth(token)).expect(200); // gỡ mã
    expect(r3.body.total).toBe(100000);
    expect(r3.body.promotionCode).toBeNull();
    expect(await usedCount(p2.id)).toBe(0);

    await http().post(`/orders/${id}/promotion`).set(auth(token)).send({ code: p1.code }).expect(200);
    await pay(token, id, `k-${randomUUID()}`).expect(201);
    await http().post(`/orders/${id}/promotion`).set(auth(token)).send({ code: p2.code }).expect(409); // đã PAID
    await http().delete(`/orders/${id}/promotion`).set(auth(token)).expect(409);
  });

  it('INT-T22: huỷ đơn trả lại lượt dùng mã khuyến mãi', async () => {
    const token = await newUser();
    const pid = await newProduct(5, 40000);
    const promo = await newPromo({ maxUses: 1 });
    const o = (await http().post('/orders').set(auth(token)).send({
      items: [{ productId: pid, size: 'S', toppings: [], quantity: 1 }], promoCode: promo.code,
    }).expect(201)).body;
    expect(await usedCount(promo.id)).toBe(1);
    await http().post(`/orders/${o.id}/cancel`).set(auth(token)).expect(200);
    expect(await usedCount(promo.id)).toBe(0);
    // lượt đã được trả nên đơn mới dùng lại được
    await http().post('/orders').set(auth(token)).send({ items: [{ productId: pid, size: 'S', toppings: [], quantity: 1 }], promoCode: promo.code }).expect(201);
  });

  it('INT-T23: thanh toán thành công cộng điểm theo số tiền thực trả, đúng 1 lần dù gửi lại cùng Idempotency-Key (FR-18)', async () => {
    const token = await newUser();
    const pid = await newProduct(10, 50000);
    const promo = await newPromo({ value: 10, maxDiscount: 20000 });
    const o = (await http().post('/orders').set(auth(token)).send({
      items: [{ productId: pid, size: 'S', toppings: [], quantity: 2 }], promoCode: promo.code,
    }).expect(201)).body; // 100.000đ − 10.000đ = 90.000đ → 9 điểm
    expect(o.total).toBe(90000);

    const key = `k-${randomUUID()}`;
    const first = await pay(token, o.id, key).expect(201);
    expect(first.body.pointsEarned).toBe(9);
    const replay = await pay(token, o.id, key).expect(201);
    expect(replay.body.pointsEarned).toBe(0);

    const me = await http().get('/loyalty/me').set(auth(token)).expect(200);
    expect(me.body.points).toBe(9);
    expect(me.body.transactions).toEqual([expect.objectContaining({ orderId: o.id, points: 9, type: 'EARN' })]);
    expect(await db.getRepository(LoyaltyTransaction).countBy({ orderId: o.id })).toBe(1);
    await http().get('/loyalty/me').expect(401);
  });

  it('INT-T24: thanh toán thất bại không cộng điểm; thử lại thành công mới được cộng một lần', async () => {
    const token = await newUser();
    const pid = await newProduct(10, 50000);
    const o = (await order(token, pid, 1).expect(201)).body; // 50.000đ → 5 điểm
    await pay(token, o.id, `k-${randomUUID()}`, { simulateFailure: true }).expect(201);
    expect((await http().get('/loyalty/me').set(auth(token))).body.points).toBe(0);
    const ok = await pay(token, o.id, `k-${randomUUID()}`).expect(201);
    expect(ok.body.pointsEarned).toBe(5);
    expect((await http().get('/loyalty/me').set(auth(token))).body.points).toBe(5);
    // đơn dưới 10.000đ không đủ 1 điểm
    const cheap = await newProduct(5, 9000);
    const c = (await order(token, cheap, 1).expect(201)).body;
    expect((await pay(token, c.id, `k-${randomUUID()}`).expect(201)).body.pointsEarned).toBe(0);
  });

  it('INT-T25: admin tạo/tắt mã khuyến mãi; khách và nhân viên bị chặn; mã bị tắt không dùng được', async () => {
    const admin = await newRoleUser(UserRole.ADMIN);
    const staff = await newRoleUser(UserRole.STAFF);
    const customer = await newUser();
    const code = `it${randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const body = { code, description: 'Giảm 5k', discountType: 'FIXED', value: 5000, minOrderTotal: 20000, maxUses: 3 };

    await http().post('/admin/promotions').set(auth(customer)).send(body).expect(403);
    await http().post('/admin/promotions').set(auth(staff.token)).send(body).expect(403);
    await http().get('/admin/promotions').set(auth(customer)).expect(403);

    const created = await http().post('/admin/promotions').set(auth(admin.token)).send(body).expect(201);
    createdPromos.push(created.body.id);
    expect(created.body.code).toBe(code.toUpperCase());
    expect(created.body.usedCount).toBe(0);
    await http().post('/admin/promotions').set(auth(admin.token)).send(body).expect(409); // trùng mã
    await http().post('/admin/promotions').set(auth(admin.token)).send({ ...body, code: 'ab' }).expect(400);
    await http().post('/admin/promotions').set(auth(admin.token)).send({ ...body, code: `${code}x`, discountType: 'PERCENT', value: 95 }).expect(400);
    await http().post('/admin/promotions').set(auth(admin.token)).send({ ...body, code: `${code}y`, value: 0 }).expect(400);

    const list = await http().get('/admin/promotions').set(auth(admin.token)).expect(200);
    expect(list.body.some((p: Promotion) => p.id === created.body.id)).toBe(true);

    const pid = await newProduct(5, 40000);
    await http().post('/orders').set(auth(customer)).send({ items: [{ productId: pid, size: 'S', toppings: [], quantity: 1 }], promoCode: code }).expect(201);
    await http().patch(`/admin/promotions/${created.body.id}`).set(auth(admin.token)).send({ isActive: false }).expect(200);
    await http().post('/orders').set(auth(customer)).send({ items: [{ productId: pid, size: 'S', toppings: [], quantity: 1 }], promoCode: code }).expect(422);
  });

  it('INT-T26: đổi điểm 1 điểm = 100đ; dưới 100 điểm bị từ chối; gỡ dùng điểm hoàn lại điểm (FR-25)', async () => {
    const pid = await newProduct(20, 50000);

    const poor = await newUserWithPoints(99); // chưa đủ 100 điểm (10.000đ)
    const o1 = await placeOrder(poor.token, pid, 2); // 100.000đ
    const denied = await http().post(`/orders/${o1.id}/points`).set(auth(poor.token)).expect(422);
    expect(denied.body.message).toMatch(/tối thiểu 100 điểm/);
    expect(await balanceOf(poor.id)).toBe(99);

    const rich = await newUserWithPoints(250);
    const o2 = await placeOrder(rich.token, pid, 2);
    const used = await http().post(`/orders/${o2.id}/points`).set(auth(rich.token)).expect(200);
    expect(used.body.pointsRedeemed).toBe(250);
    expect(used.body.pointsDiscount).toBe(25000); // 250 điểm × 100đ
    expect(used.body.total).toBe(75000);
    expect(await balanceOf(rich.id)).toBe(0);

    // gọi lại không trừ điểm lần hai
    await http().post(`/orders/${o2.id}/points`).set(auth(rich.token)).expect(200);
    expect(await balanceOf(rich.id)).toBe(0);

    const removed = await http().delete(`/orders/${o2.id}/points`).set(auth(rich.token)).expect(200);
    expect(removed.body.total).toBe(100000);
    expect(removed.body.pointsRedeemed).toBe(0);
    expect(await balanceOf(rich.id)).toBe(250);

    const ledger = await db.getRepository(LoyaltyTransaction).find({ where: { orderId: o2.id }, order: { id: 'ASC' } });
    expect(ledger.map((t) => [t.type, t.points])).toEqual([['REDEEM', -250], ['REFUND', 250], ['REDEEM', -250], ['REFUND', 250]]);
    await http().post(`/orders/${o2.id}/points`).set(auth(poor.token)).expect(404); // đơn của người khác
  });

  it('INT-T27: dùng điểm cùng mã khuyến mãi; đơn nhỏ vẫn trả tối thiểu 1.000đ; huỷ đơn hoàn điểm; điểm tích trên số tiền thực trả', async () => {
    const pid = await newProduct(20, 50000);
    const promo = await newPromo({ value: 10 });
    const u = await newUserWithPoints(250);
    const o = await placeOrder(u.token, pid, 2); // 100.000đ

    await http().post(`/orders/${o.id}/promotion`).set(auth(u.token)).send({ code: promo.code }).expect(200); // −10.000đ → 90.000đ
    const both = await http().post(`/orders/${o.id}/points`).set(auth(u.token)).expect(200); // −25.000đ
    expect(both.body.total).toBe(65000);

    // gỡ mã: điểm vẫn giữ, tổng tính lại
    const noPromo = await http().delete(`/orders/${o.id}/promotion`).set(auth(u.token)).expect(200);
    expect(noPromo.body.total).toBe(75000);
    expect(noPromo.body.pointsRedeemed).toBe(250);
    expect(await balanceOf(u.id)).toBe(0);

    const paid = await pay(u.token, o.id, `k-${randomUUID()}`).expect(201);
    expect(paid.body.amount).toBe(75000);
    expect(paid.body.pointsEarned).toBe(7); // floor(75.000 / 10.000)
    expect(await balanceOf(u.id)).toBe(7);
    await http().post(`/orders/${o.id}/points`).set(auth(u.token)).expect(409); // đã PAID
    await http().delete(`/orders/${o.id}/points`).set(auth(u.token)).expect(409);

    // đơn nhỏ: số điểm bị giới hạn để còn trả 1.000đ, huỷ đơn thì hoàn đủ điểm
    const cheap = await newProduct(5, 30000);
    const big = await newUserWithPoints(5000);
    const small = await placeOrder(big.token, cheap, 1);
    const capped = await http().post(`/orders/${small.id}/points`).set(auth(big.token)).expect(200);
    expect(capped.body.total).toBe(1000);
    expect(capped.body.pointsRedeemed).toBe(290);
    expect(await balanceOf(big.id)).toBe(5000 - 290);
    await http().post(`/orders/${small.id}/cancel`).set(auth(big.token)).expect(200);
    expect(await balanceOf(big.id)).toBe(5000);
  });

  it('INT-T28: hai đơn cùng dùng điểm một lúc không làm số dư âm (chỉ một đơn được dùng)', async () => {
    const pid = await newProduct(20, 50000);
    const u = await newUserWithPoints(150);
    const [a, b] = [await placeOrder(u.token, pid, 2), await placeOrder(u.token, pid, 2)];
    const results = await Promise.all([a, b].map((o) => http().post(`/orders/${o.id}/points`).set(auth(u.token))));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses[0]).toBe(200);
    expect([409, 422]).toContain(statuses[1]);
    expect(await balanceOf(u.id)).toBe(0);
    const redeemed = await db.getRepository(LoyaltyTransaction).find({ where: { userId: u.id, type: 'REDEEM' } });
    expect(redeemed.map((t) => t.points)).toEqual([-150]);
  });
});
