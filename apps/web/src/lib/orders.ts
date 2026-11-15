import { OrderStatus } from './api';
import { SIZES, TOPPINGS } from './options';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng — mời tới quầy',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
};

export const PAYABLE: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED'];
export const FINAL: OrderStatus[] = ['COMPLETED', 'CANCELLED'];
export const PROGRESS: OrderStatus[] = ['PAID', 'PREPARING', 'READY', 'COMPLETED'];

export function describeLine(size: string | null, toppings: string[]): string {
  const sizeLabel = size ? (SIZES.find((s) => s.code === size)?.label ?? size) : null;
  const tops = toppings.map((c) => TOPPINGS.find((t) => t.code === c)?.label ?? c);
  return [sizeLabel, ...tops].filter(Boolean).join(' · ');
}

/** Khoá chống thanh toán trùng. Dùng crypto.randomUUID nếu có, nếu không thì tự sinh. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
