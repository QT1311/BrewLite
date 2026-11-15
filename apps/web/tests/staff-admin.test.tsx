import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AdminDashboard } from '@/components/AdminDashboard';
import { AuthForm } from '@/components/AuthForm';
import { AuthLink } from '@/components/AuthLink';
import { StaffBoard } from '@/components/StaffBoard';
import { AuthProvider } from '@/lib/AuthContext';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const res = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
const person = (role: string) => ({ id: 1, email: 'x@b.com', name: 'Người dùng', role });

type Call = { url: string; init?: RequestInit };

const ticket = (id: number, status: string) => ({
  id, status, total: 80000, createdAt: '2026-11-15T08:00:00Z', updatedAt: '2026-11-15T08:00:00Z',
  customerName: 'Lan', items: [{ id: id * 10, name: 'Cà phê sữa', size: 'M', toppings: [], unitPrice: 40000, quantity: 2 }],
});

const report = {
  days: 7, totalRevenue: 250000, orderCount: 3, averageOrder: 83333, today: { revenue: 80000, orders: 1 },
  byDay: Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-${String(9 + i).padStart(2, '0')}`, revenue: i === 6 ? 80000 : 0, orders: i === 6 ? 1 : 0 })),
  topProducts: [{ name: 'Cà phê sữa', quantity: 5, revenue: 200000 }],
  ordersByStatus: { PAID: 2, COMPLETED: 1 },
};

/** Giả lập API; `queue` là danh sách trả về cho các lần GET /staff/orders kế tiếp. */
function mockApi(role: string, queue: unknown[][] = [[]]) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/me')) return res(200, person(role));
    if (url.endsWith('/staff/orders')) return res(200, queue.length > 1 ? queue.shift() : queue[0]);
    if (/\/orders\/\d+\/status$/.test(url)) return res(200, {});
    if (url.includes('/admin/stats/revenue')) return res(200, report);
    if (url.endsWith('/admin/staff') && init?.method === 'POST') return res(201, { id: 9, name: 'Mới', email: 'm@b.com', isActive: true, createdAt: '2026-11-15T00:00:00Z' });
    if (url.endsWith('/admin/staff')) return res(200, []);
    return res(404, {});
  }));
  return calls;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('brewlite.token.v1', 'tok');
  push.mockClear();
  replace.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('đăng nhập theo vai trò', () => {
  const cases: Array<[string, string]> = [['staff', '/staff'], ['admin', '/admin'], ['customer', '/']];
  it.each(cases)('vai trò %s được đưa tới %s khi không có trang đích', async (role, target) => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => res(200, { accessToken: 't', user: person(role) })));
    render(<AuthProvider><AuthForm mode="login" /></AuthProvider>);
    await userEvent.type(screen.getByLabelText('Email'), 'x@b.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(target));
  });

  it('thanh điều hướng chỉ hiện liên kết đúng với vai trò', async () => {
    const check = async (role: string) => {
      mockApi(role);
      const { unmount } = render(<AuthProvider><AuthLink /></AuthProvider>);
      await screen.findByTestId('user-name');
      const result = { staff: !!screen.queryByTestId('nav-staff'), admin: !!screen.queryByTestId('nav-admin') };
      unmount();
      return result;
    };
    expect(await check('customer')).toEqual({ staff: false, admin: false });
    expect(await check('staff')).toEqual({ staff: true, admin: false });
    expect(await check('admin')).toEqual({ staff: true, admin: true });
  });
});

describe('StaffBoard', () => {
  it('khách hàng bị từ chối, không gọi API hàng đợi', async () => {
    const calls = mockApi('customer');
    render(<AuthProvider><StaffBoard /></AuthProvider>);
    expect(await screen.findByText('Bạn không có quyền truy cập')).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/staff/orders'))).toBe(false);
  });

  it('nhân viên thấy đơn theo cột và bấm nút để chuyển trạng thái', async () => {
    const calls = mockApi('staff', [[ticket(5, 'PAID'), ticket(6, 'READY')], [ticket(6, 'READY')]]);
    render(<AuthProvider><StaffBoard /></AuthProvider>);

    const paidCol = await screen.findByTestId('col-PAID');
    expect(within(paidCol).getByText('Đơn #5')).toBeInTheDocument();
    expect(within(paidCol).getByText('2× Cà phê sữa')).toBeInTheDocument();
    expect(within(screen.getByTestId('col-READY')).getByText('Đơn #6')).toBeInTheDocument();

    await userEvent.click(within(paidCol).getByRole('button', { name: 'Bắt đầu pha' }));
    const patch = calls.find((c) => c.init?.method === 'PATCH')!;
    expect(patch.url).toMatch(/\/orders\/5\/status$/);
    expect(JSON.parse(patch.init!.body as string)).toEqual({ status: 'PREPARING' });
    expect((patch.init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    await waitFor(() => expect(within(screen.getByTestId('col-PAID')).queryByText('Đơn #5')).not.toBeInTheDocument());
  });
});

describe('AdminDashboard', () => {
  it('staff không vào được khu admin', async () => {
    const calls = mockApi('staff');
    render(<AuthProvider><AdminDashboard /></AuthProvider>);
    expect(await screen.findByText('Bạn không có quyền truy cập')).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes('/admin/'))).toBe(false);
  });

  it('admin thấy doanh thu, số đơn và món bán chạy', async () => {
    mockApi('admin');
    render(<AuthProvider><AdminDashboard /></AuthProvider>);
    expect(await screen.findByTestId('stat-revenue')).toHaveTextContent('250.000đ');
    expect(screen.getByTestId('stat-orders')).toHaveTextContent('3');
    expect(screen.getByText('Cà phê sữa')).toBeInTheDocument();
  });

  it('tạo nhân viên: kiểm tra mật khẩu ở client, hợp lệ thì gọi API và thêm vào danh sách', async () => {
    const calls = mockApi('admin');
    render(<AuthProvider><AdminDashboard /></AuthProvider>);
    await userEvent.click(await screen.findByRole('tab', { name: 'Nhân viên' }));
    await userEvent.type(await screen.findByLabelText('Tên'), 'Mới');
    await userEvent.type(screen.getByLabelText('Email'), 'm@b.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu ban đầu'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhân viên' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu tối thiểu 8 ký tự');
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);

    await userEvent.type(screen.getByLabelText('Mật khẩu ban đầu'), '45678');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhân viên' }));
    expect(await screen.findByTestId('staff-row')).toHaveTextContent('m@b.com');
  });
});
