import { ConflictException } from '@nestjs/common';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Máy trạng thái đơn hàng (FR-16):
 *   PENDING → PAID → PREPARING → READY → COMPLETED
 *   PENDING → PAYMENT_FAILED → (thanh toán lại) PAID
 *   PENDING / PAYMENT_FAILED → CANCELLED
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Không thể chuyển đơn từ ${from} sang ${to}`);
  }
}

/** Các trạng thái còn giữ tồn kho; huỷ đơn ở các trạng thái này sẽ hoàn kho. */
export const PAYABLE_STATUSES = [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED];
