'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, Order, fetchMyOrders, formatVND } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { StatusBadge } from './StatusBadge';

export function OrderHistory() {
  const { status, token, logout } = useRequireAuth('/orders');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authed' || !token) return;
    fetchMyOrders(token)
      .then(setOrders)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được lịch sử đơn');
      });
  }, [status, token, logout]);

  if (error) return <div className="state-box" role="alert"><h2>Có lỗi</h2><p>{error}</p></div>;
  if (!orders) return <div className="detail skeleton" role="status" aria-label="Đang tải lịch sử đơn" />;
  if (orders.length === 0) {
    return (
      <div className="state-box">
        <h2>Bạn chưa có đơn nào</h2>
        <p>Đơn hàng sẽ xuất hiện ở đây sau khi bạn đặt.</p>
        <Link href="/" className="btn">Xem thực đơn</Link>
      </div>
    );
  }
  return (
    <ul className="history">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="history-row" data-testid="history-row">
            <div>
              <strong>Đơn #{o.id}</strong>
              <small>
                {new Date(o.createdAt).toLocaleString('vi-VN')} · {o.items.reduce((s, i) => s + i.quantity, 0)} món
              </small>
            </div>
            <div className="history-right">
              <StatusBadge status={o.status} />
              <span className="price">{formatVND(o.total)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
