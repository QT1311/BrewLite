import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Checkout } from '@/components/Checkout';
import { CartView } from '@/components/CartView';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';

const push = vi.fn();
const replace = vi.fn();
// Router ổn định giữa các lần render, giống Next.js thật.
const router = { push, replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const user = { id: 1, email: 'a@b.com', name: 'An' };
const order = {
  id: 42, status: 'PENDING', total: 80000, promotionCode: null, discountAmount: 0, pointsRedeemed: 0, pointsDiscount: 0, createdAt: '2026-10-30T08:00:00Z', updatedAt: '2026-10-30T08:00:00Z',
  items: [{ id: 1, productId: 1, name: 'Cà phê sữa', size: 'M', toppings: [], unitPrice: 40000, quantity: 2 }],
};

/** Số điểm thưởng giả lập của khách trong từng test. */
let pointsBalance = 0;

type Call = { url: string; init?: RequestInit };
const res = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });

/** Giả lập API: định tuyến theo URL + method. */
function mockApi(payments: Array<ReturnType<typeof res> | Error>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/me')) return res(200, user);
    if (url.endsWith('/orders') && init?.method === 'POST') return res(201, order);
    if (url.endsWith('/orders/42/promotion') && init?.method === 'POST') {
      const code = JSON.parse(init.body as string).code;
      if (code === 'HETHAN') return res(422, { message: 'Mã khuyến mãi đã hết hạn' });
      return res(200, { ...order, promotionCode: code.trim().toUpperCase(), discountAmount: 8000, total: 72000 });
    }
    if (url.endsWith('/orders/42/promotion') && init?.method === 'DELETE') return res(200, order);
    if (url.endsWith('/loyalty/me')) return res(200, { points: pointsBalance, transactions: [] });
    if (url.endsWith('/orders/42/points') && init?.method === 'POST') {
      if (pointsBalance < 100) return res(422, { message: 'Cần tối thiểu 100 điểm' });
      return res(200, { ...order, pointsRedeemed: pointsBalance, pointsDiscount: pointsBalance * 100, total: 80000 - pointsBalance * 100 });
    }
    if (url.endsWith('/orders/42/points') && init?.method === 'DELETE') return res(200, order);
    if (url.endsWith('/orders/42')) return res(200, order);
    if (url.endsWith('/payments')) {
      const next = payments.shift();
      if (next instanceof Error) throw next;
      return next;
    }
    return res(404, {});
  }));
  return calls;
}

const keyOf = (c: Call) => (c.init?.headers as Record<string, string>)['Idempotency-Key'];
const paymentCalls = (calls: Call[]) => calls.filter((c) => c.url.endsWith('/payments'));

function renderCheckout() {
  return render(
    <AuthProvider>
      <CartProvider>
        <Checkout id={42} />
      </CartProvider>
    </AuthProvider>,
  );
}

beforeEach(() => {
  pointsBalance = 0;
  localStorage.clear();
  localStorage.setItem('brewlite.token.v1', 'tok');
  localStorage.setItem('brewlite.cart.v2', JSON.stringify([
    { key: '1|M|', productId: 1, name: 'Cà phê sữa', imageUrl: null, size: 'M', toppings: [], unitPrice: 40000, quantity: 2 },
  ]));
  push.mockClear();
  replace.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Giỏ hàng → đặt đơn', () => {
  it('gửi POST /orders với đúng dữ liệu (không gửi giá) và chuyển sang trang thanh toán', async () => {
    const calls = mockApi([]);
    render(<AuthProvider><CartProvider><CartView /></CartProvider></AuthProvider>);
    await userEvent.click(await screen.findByRole('button', { name: 'Đặt đơn' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/42'));
    const post = calls.find((c) => c.url.endsWith('/orders'))!;
    expect(JSON.parse(post.init!.body as string)).toEqual({
      items: [{ productId: 1, size: 'M', toppings: [], quantity: 2 }],
    });
  });
});

describe('Checkout', () => {
  it('thanh toán thành công: gửi Idempotency-Key, xoá giỏ, chuyển tới trang xác nhận', async () => {
    const calls = mockApi([res(201, { paymentId: 9, orderId: 42, status: 'SUCCEEDED', orderStatus: 'PAID', amount: 80000, failureReason: null })]);
    renderCheckout();
    expect(await screen.findByTestId('order-total')).toHaveTextContent('80.000đ');
    await userEvent.click(screen.getByLabelText(/Thẻ ngân hàng/));
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận trả/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/42'));
    const [p] = paymentCalls(calls);
    expect(keyOf(p)).toMatch(/.{8,}/);
    expect(JSON.parse(p.init!.body as string)).toMatchObject({ orderId: 42, method: 'CARD' });
    expect(JSON.parse(localStorage.getItem('brewlite.cart.v2')!)).toEqual([]);
  });

  it('thanh toán thất bại: báo lỗi, giữ giỏ, lần thử lại dùng key mới', async () => {
    const calls = mockApi([
      res(201, { paymentId: 1, orderId: 42, status: 'FAILED', orderStatus: 'PAYMENT_FAILED', amount: 80000, failureReason: 'Ví không đủ số dư (giả lập)' }),
      res(201, { paymentId: 2, orderId: 42, status: 'SUCCEEDED', orderStatus: 'PAID', amount: 80000, failureReason: null }),
    ]);
    renderCheckout();
    await userEvent.click(await screen.findByLabelText(/Giả lập thanh toán thất bại/));
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận trả/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ví không đủ số dư');
    expect(screen.getByTestId('order-status')).toHaveTextContent('Thanh toán thất bại');
    expect(JSON.parse(localStorage.getItem('brewlite.cart.v2')!)).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Xác nhận trả/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/42'));
    const [first, second] = paymentCalls(calls);
    expect(keyOf(first)).not.toBe(keyOf(second));
  });

  it('lỗi mạng: bấm lại dùng CÙNG key để server không trừ tiền 2 lần', async () => {
    const calls = mockApi([
      new TypeError('Failed to fetch'),
      res(201, { paymentId: 3, orderId: 42, status: 'SUCCEEDED', orderStatus: 'PAID', amount: 80000, failureReason: null }),
    ]);
    renderCheckout();
    await userEvent.click(await screen.findByRole('button', { name: /Xác nhận trả/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ');
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận trả/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/42'));
    const [first, second] = paymentCalls(calls);
    expect(keyOf(first)).toBe(keyOf(second));
  });

  it('đơn đã thanh toán thì chuyển thẳng sang trang đơn hàng', async () => {
    order.status = 'PAID';
    mockApi([]);
    renderCheckout();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/orders/42'));
    order.status = 'PENDING';
  });
});

describe('Checkout — mã khuyến mãi (FR-18)', () => {
  it('áp mã hợp lệ: hiện tạm tính, giảm giá và tổng mới do server tính', async () => {
    const calls = mockApi([]);
    renderCheckout();
    await userEvent.type(await screen.findByLabelText('Mã khuyến mãi'), 'brew10');
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByTestId('promo-applied')).toHaveTextContent('BREW10');
    expect(screen.getByTestId('order-discount')).toHaveTextContent('8.000đ');
    expect(screen.getByTestId('order-total')).toHaveTextContent('72.000đ');
    expect(screen.getByRole('button', { name: /Xác nhận trả 72\.000đ/ })).toBeInTheDocument();
    const call = calls.find((c) => c.url.endsWith('/promotion'))!;
    expect(JSON.parse(call.init!.body as string)).toEqual({ code: 'brew10' });
  });

  it('mã bị từ chối: hiện lý do và giữ nguyên tổng tiền', async () => {
    mockApi([]);
    renderCheckout();
    await userEvent.type(await screen.findByLabelText('Mã khuyến mãi'), 'HETHAN');
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã khuyến mãi đã hết hạn');
    expect(screen.getByTestId('order-total')).toHaveTextContent('80.000đ');
    expect(screen.queryByTestId('promo-applied')).not.toBeInTheDocument();
  });

  it('gỡ mã: trả về tổng ban đầu', async () => {
    const calls = mockApi([]);
    renderCheckout();
    await userEvent.type(await screen.findByLabelText('Mã khuyến mãi'), 'BREW10');
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Gỡ mã' }));
    await waitFor(() => expect(screen.getByTestId('order-total')).toHaveTextContent('80.000đ'));
    expect(screen.queryByTestId('promo-applied')).not.toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/promotion') && c.init?.method === 'DELETE')).toBe(true);
  });

  it('nút Áp dụng bị khoá khi ô mã trống', async () => {
    mockApi([]);
    renderCheckout();
    expect(await screen.findByRole('button', { name: 'Áp dụng' })).toBeDisabled();
  });
});

describe('Checkout — đổi điểm thưởng (FR-25)', () => {
  it('dưới 100 điểm: nút Dùng điểm bị khoá và có gợi ý mức tối thiểu', async () => {
    pointsBalance = 99;
    const calls = mockApi([]);
    renderCheckout();
    await waitFor(() => expect(screen.getByTestId('points-balance')).toHaveTextContent('99'));
    expect(screen.getByRole('button', { name: 'Dùng điểm' })).toBeDisabled();
    expect(screen.getByTestId('points-hint')).toHaveTextContent('Cần tối thiểu 100 điểm (10.000đ)');
    expect(calls.some((c) => c.url.endsWith('/points'))).toBe(false);
  });

  it('từ 100 điểm: dùng điểm giảm 100đ mỗi điểm, hiện dòng giảm và tổng mới', async () => {
    pointsBalance = 250;
    const calls = mockApi([]);
    renderCheckout();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dùng điểm' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Dùng điểm' }));
    expect(await screen.findByTestId('points-applied')).toHaveTextContent('250');
    expect(screen.getByTestId('order-points-discount')).toHaveTextContent('25.000đ');
    expect(screen.getByTestId('order-total')).toHaveTextContent('55.000đ');
    expect(calls.some((c) => c.url.endsWith('/orders/42/points') && c.init?.method === 'POST')).toBe(true);
  });

  it('bỏ dùng điểm: trả về tổng ban đầu', async () => {
    pointsBalance = 250;
    const calls = mockApi([]);
    renderCheckout();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dùng điểm' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Dùng điểm' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ dùng điểm' }));
    await waitFor(() => expect(screen.getByTestId('order-total')).toHaveTextContent('80.000đ'));
    expect(screen.queryByTestId('points-applied')).not.toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/orders/42/points') && c.init?.method === 'DELETE')).toBe(true);
  });
});
