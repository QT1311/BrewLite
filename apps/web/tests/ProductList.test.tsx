import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProductList } from '@/components/ProductList';

const sample = [
  { id: 1, name: 'Cà phê sữa', description: 'Đậm đà', price: 35000, imageUrl: '/images/ca-phe-sua.svg', category: 'ca-phe', stock: 10 },
  { id: 2, name: 'Trà đào', description: 'Mát lạnh', price: 39000, imageUrl: null, category: 'tra', stock: 0 },
];

function mockFetch(impl: () => Promise<Partial<Response>>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

afterEach(() => vi.unstubAllGlobals());

describe('ProductList', () => {
  it('hiển thị skeleton khi đang tải', () => {
    mockFetch(() => new Promise(() => {}));
    render(<ProductList />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(6);
  });

  it('hiển thị danh sách sản phẩm với giá VND và nhãn hết hàng', async () => {
    mockFetch(async () => ({ ok: true, json: async () => sample }));
    render(<ProductList />);
    expect(await screen.findAllByTestId('product-card')).toHaveLength(2);
    expect(screen.getByText('35.000đ')).toBeInTheDocument();
    expect(screen.getByText('Hết hàng')).toBeInTheDocument();
  });

  it('chia theo loại và lọc được theo chip + tìm kiếm không dấu', async () => {
    mockFetch(async () => ({ ok: true, json: async () => sample }));
    render(<ProductList />);
    await screen.findAllByTestId('product-card');
    expect(screen.getByRole('heading', { name: 'Cà phê 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Trà' }));
    expect(screen.getAllByTestId('product-card')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Tất cả' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món' }), 'ca phe');
    expect(screen.getAllByTestId('product-card')).toHaveLength(1);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món' }), ' xyz');
    expect(screen.getByText('Không tìm thấy món phù hợp')).toBeInTheDocument();
  });

  it('hiển thị trạng thái rỗng khi API trả danh sách trống', async () => {
    mockFetch(async () => ({ ok: true, json: async () => [] }));
    render(<ProductList />);
    expect(await screen.findByText('Thực đơn đang trống')).toBeInTheDocument();
  });

  it('hiển thị lỗi và cho phép thử lại', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => sample });
    vi.stubGlobal('fetch', fn);
    render(<ProductList />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được thực đơn');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getAllByTestId('product-card')).toHaveLength(2));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
