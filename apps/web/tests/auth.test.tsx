import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AuthForm } from '@/components/AuthForm';
import { AuthLink } from '@/components/AuthLink';
import { AuthProvider } from '@/lib/AuthContext';
import { safeRedirect } from '@/lib/redirect';

const push = vi.fn();
const router = { push };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const authOk = { accessToken: 'tok123', user: { id: 1, email: 'a@b.com', name: 'An' } };

function App({ mode = 'login' as 'login' | 'register', next }: { mode?: 'login' | 'register'; next?: string }) {
  return (
    <AuthProvider>
      <AuthLink />
      <AuthForm mode={mode} next={next} />
    </AuthProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  push.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('safeRedirect', () => {
  it('chỉ cho phép đường dẫn nội bộ', () => {
    expect(safeRedirect('/cart')).toBe('/cart');
    expect(safeRedirect('https://evil.com')).toBe('/');
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
  });
});

describe('AuthForm', () => {
  it('nút Hiện/Ẩn đổi kiểu ô mật khẩu mà không xoá nội dung đã nhập', async () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<App />);
    const input = screen.getByLabelText('Mật khẩu');
    await userEvent.type(input, 'matkhau123');
    expect(input).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Hiện mật khẩu' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('matkhau123');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('validate phía client, không gọi API khi dữ liệu sai', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await userEvent.type(screen.getByLabelText('Email'), 'khong-hop-le');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email không hợp lệ');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('đăng nhập thành công: lưu token, hiện tên, chuyển trang', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => authOk })));
    render(<App next="/cart" />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/cart'));
    expect(localStorage.getItem('brewlite.token.v1')).toBe('tok123');
    expect(screen.getByTestId('user-name')).toHaveTextContent('An');
  });

  it('hiện thông báo lỗi từ server khi sai mật khẩu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ message: 'Email hoặc mật khẩu không đúng' }) })),
    );
    render(<App />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'saisai');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng');
    expect(push).not.toHaveBeenCalled();
  });

  it('đăng ký yêu cầu mật khẩu tối thiểu 8 ký tự', async () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<App mode="register" />);
    await userEvent.type(screen.getByLabelText('Tên hiển thị'), 'An');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tối thiểu 8 ký tự');
  });
});

describe('AuthProvider', () => {
  it('khôi phục phiên từ token đã lưu và cho phép đăng xuất', async () => {
    localStorage.setItem('brewlite.token.v1', 'tok123');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => authOk.user })));
    render(<App />);
    expect(await screen.findByTestId('user-name')).toHaveTextContent('An');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(localStorage.getItem('brewlite.token.v1')).toBeNull();
    expect(screen.getByText('Đăng nhập', { selector: 'a' })).toBeInTheDocument();
  });

  it('xoá token khi server trả 401 (hết hạn)', async () => {
    localStorage.setItem('brewlite.token.v1', 'het-han');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    render(<App />);
    await waitFor(() => expect(localStorage.getItem('brewlite.token.v1')).toBeNull());
  });
});
