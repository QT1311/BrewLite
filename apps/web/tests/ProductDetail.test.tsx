import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProductDetail } from '@/components/ProductDetail';
import { CartView } from '@/components/CartView';
import { CartLink } from '@/components/CartLink';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const product = { id: 1, name: 'Cà phê sữa', description: 'Đậm đà', price: 35000, imageUrl: null, category: 'ca-phe', stock: 10, sizePrices: { S: 35000, M: 40000, L: 45000 }, allowToppings: true };

function mockProduct(res: Partial<Response>) {
  vi.stubGlobal('fetch', vi.fn(async () => res));
}

function Page() {
  return (
    <AuthProvider>
      <CartProvider>
        <CartLink />
        <ProductDetail id={1} />
        <CartView />
      </CartProvider>
    </AuthProvider>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('ProductDetail + giỏ hàng', () => {
  it('đổi size/topping thì đơn giá cập nhật', async () => {
    mockProduct({ ok: true, status: 200, json: async () => product });
    render(<Page />);
    expect(await screen.findByTestId('unit-price')).toHaveTextContent('35.000đ'); // size nhỏ nhất (S) mặc định
    await userEvent.click(screen.getByLabelText(/Size L/));
    expect(screen.getByTestId('unit-price')).toHaveTextContent('45.000đ');
    await userEvent.click(screen.getByLabelText(/Trân châu/));
    expect(screen.getByTestId('unit-price')).toHaveTextContent('53.000đ');
  });

  it('thêm vào giỏ tăng badge và hiện đúng tổng tiền', async () => {
    mockProduct({ ok: true, status: 200, json: async () => product });
    render(<Page />);
    await screen.findByTestId('unit-price');
    await userEvent.click(screen.getByRole('button', { name: 'Tăng' }));
    await userEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }));
    expect(screen.getByTestId('cart-badge')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('70.000đ');
    await userEvent.click(screen.getByRole('button', { name: 'Tăng Cà phê sữa' }));
    expect(screen.getByTestId('cart-total')).toHaveTextContent('105.000đ');
    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }));
    expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
  });

  it('món 1 cỡ không hiện chọn size/topping và dùng giá cố định', async () => {
    mockProduct({ ok: true, status: 200, json: async () => ({ ...product, name: 'Bánh Tiramisu', price: 39000, sizePrices: null, allowToppings: false }) });
    render(<Page />);
    expect(await screen.findByTestId('unit-price')).toHaveTextContent('39.000đ');
    expect(screen.queryByText('Chọn size')).not.toBeInTheDocument();
    expect(screen.queryByText('Topping')).not.toBeInTheDocument();
  });

  it('hiện thông báo khi không tìm thấy sản phẩm', async () => {
    mockProduct({ ok: false, status: 404, json: async () => ({}) });
    render(<Page />);
    expect(await screen.findByText('Không tìm thấy sản phẩm')).toBeInTheDocument();
  });

  it('hiện lỗi khi server lỗi', async () => {
    mockProduct({ ok: false, status: 500, json: async () => ({}) });
    render(<Page />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được sản phẩm');
  });
});
