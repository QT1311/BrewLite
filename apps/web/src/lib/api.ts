export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  stock: number;
  /** Giá theo size; null/undefined = món chỉ có 1 cỡ (giá cố định = price). */
  sizePrices?: Record<string, number> | null;
  allowToppings?: boolean;
}

export const CATEGORY_ORDER = ['ca-phe', 'tra', 'matcha', 'da-xay', 'khac', 'banh'];
export const CATEGORY_LABELS: Record<string, string> = {
  'ca-phe': 'Cà phê',
  tra: 'Trà',
  matcha: 'Matcha',
  'da-xay': 'Đá xay',
  khac: 'Thức uống khác',
  banh: 'Bánh',
};

/** Giá hiển thị trên thẻ: giá của size nhỏ nhất (price đã là giá thấp nhất). */
export function priceLabel(p: Pick<Product, 'price'>): string {
  return formatVND(p.price);
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, { signal });
  if (!res.ok) throw new Error(`Máy chủ trả về lỗi ${res.status}`);
  return (await res.json()) as Product[];
}

export async function fetchProduct(id: number, signal?: AbortSignal): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, { signal });
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error(`Máy chủ trả về lỗi ${res.status}`);
  return (await res.json()) as Product;
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError('Không kết nối được máy chủ', 0);
  }
  if (!res.ok) {
    let message = `Máy chủ trả về lỗi ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message[0];
      else if (body.message) message = body.message;
    } catch {
      /* giữ message mặc định */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

const json = { 'Content-Type': 'application/json' };

export const registerUser = (data: { email: string; name: string; password: string }) =>
  authRequest<AuthResult>('/auth/register', { method: 'POST', headers: json, body: JSON.stringify(data) });

export const loginUser = (data: { email: string; password: string }) =>
  authRequest<AuthResult>('/auth/login', { method: 'POST', headers: json, body: JSON.stringify(data) });

export const fetchMe = (token: string) =>
  authRequest<AuthUser>('/auth/me', { headers: { Authorization: `Bearer ${token}` } });

// ===== Đơn hàng & thanh toán =====
export type OrderStatus =
  | 'PENDING' | 'PAID' | 'PAYMENT_FAILED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderLine {
  id: number;
  productId: number;
  name: string;
  size: string | null;
  toppings: string[];
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  items: OrderLine[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'EWALLET' | 'CARD';

export interface PaymentResult {
  paymentId: number;
  orderId: number;
  status: 'SUCCEEDED' | 'FAILED';
  orderStatus: OrderStatus;
  amount: number;
  failureReason: string | null;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export const createOrder = (
  token: string,
  items: { productId: number; size: string | null; toppings: string[]; quantity: number }[],
) =>
  authRequest<Order>('/orders', {
    method: 'POST',
    headers: { ...json, ...bearer(token) },
    body: JSON.stringify({ items }),
  });

export const fetchOrder = (token: string, id: number) => authRequest<Order>(`/orders/${id}`, { headers: bearer(token) });

export const fetchMyOrders = (token: string) => authRequest<Order[]>('/orders/me', { headers: bearer(token) });

export const cancelOrder = (token: string, id: number) =>
  authRequest<Order>(`/orders/${id}/cancel`, { method: 'POST', headers: bearer(token) });

export const payOrder = (
  token: string,
  idempotencyKey: string,
  body: { orderId: number; method: PaymentMethod; simulateFailure?: boolean },
) =>
  authRequest<PaymentResult>('/payments', {
    method: 'POST',
    headers: { ...json, ...bearer(token), 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  });
