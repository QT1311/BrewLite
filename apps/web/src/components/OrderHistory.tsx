'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, Order, fetchLoyalty, fetchMyOrders, formatVND } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { StatusBadge } from './StatusBadge';

/** Số điểm thưởng hiện có (1 điểm cho mỗi 10.000đ đã thanh toán). Lỗi tải điểm không ảnh hưởng danh sách đơn. */
function LoyaltyBanner({ token }: { token: string }) {
  const [points, setPoints] = useState<number | null>(null);
  useEffect(() => {
    let stopped = false;
    fetchLoyalty(token)
      .then((s) => !stopped && setPoints(s.points))
      .catch(() => undefined);
    return () => {
      stopped = true;
    };
  }, [token]);
  if (points === null) return null;
  return (
    <p className="loyalty-banner" data-testid="loyalty-points">
      Điểm thưởng của bạn: <strong>{points}</strong> <small>(1 điểm cho mỗi 10.000đ)</small>
    </p>
  );
}

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
        <Link href="/thuc-don" className="btn">Xem thực đơn</Link>
      </div>
    );
  }
  return (
    <>
      {token && <LoyaltyBanner token={token} />}
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
    </>
  );
}
