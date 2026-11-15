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
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role';

describe('Orders & Payments (integration)', () => {
  let app: INestApplication;
  let db: DataSource;
  const createdUsers: string[] = [];
  const createdProducts: number[] = [];

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
});
