'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, Order, fetchOrder, formatVND } from '@/lib/api';
import { FINAL, PAYABLE, PROGRESS, STATUS_LABEL, describeLine } from '@/lib/orders';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { StatusBadge } from './StatusBadge';

const POLL_MS = 5000;

export function OrderDetail({ id }: { id: number }) {
  const { status, token, logout } = useRequireAuth(`/orders/${id}`);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Theo dõi đơn (UC9): tải lại định kỳ cho tới khi đơn kết thúc.
  useEffect(() => {
    if (status !== 'authed' || !token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const load = async () => {
      try {
        const o = await fetchOrder(token, id);
        if (stopped) return;
        setOrder(o);
        setError(null);
        if (!FINAL.includes(o.status)) timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được đơn hàng');
      }
    };
    load();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [status, token, id, logout]);

  if (error && !order) {
    return (
      <div className="state-box" role="alert">
        <h2>Không tải được đơn hàng</h2>
        <p>{error}</p>
        <Link href="/orders" className="btn">Lịch sử đơn</Link>
      </div>
    );
  }
  if (!order) return <div className="detail skeleton" role="status" aria-label="Đang tải đơn hàng" />;

  const step = PROGRESS.indexOf(order.status);
  const success = step >= 0;

  return (
    <div className="order-detail">
      {success && (
        <div className="success-hero">
          <div className="check" aria-hidden="true">✓</div>
          <h1>Đặt hàng thành công</h1>
          <p>Mã đơn <strong data-testid="order-code">#{order.id}</strong> — mời bạn tới quầy khi đồ uống sẵn sàng.</p>
        </div>
      )}
      <div className="panel">
        <div className="panel-head">
          <h2>Đơn #{order.id}</h2>
          <StatusBadge status={order.status} />
        </div>
        {success && (
          <ol className="steps" aria-label="Tiến độ đơn hàng">
            {PROGRESS.map((s, i) => (
              <li key={s} className={i <= step ? 'done' : ''}>{STATUS_LABEL[s]}</li>
            ))}
          </ol>
        )}
        <ul className="lines">
          {order.items.map((it) => (
            <li key={it.id}>
              <span>
                {it.name} × {it.quantity}
                <small>{describeLine(it.size, it.toppings)}</small>
              </span>
              <span>{formatVND(it.unitPrice * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="sum-row"><span>Tổng</span><strong>{formatVND(order.total)}</strong></div>
        <p className="muted small">Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
        {PAYABLE.includes(order.status) && (
          <Link href={`/checkout/${order.id}`} className="btn btn-lg full">Thanh toán đơn này</Link>
        )}
      </div>
      <div className="row-links">
        <Link href="/">← Tiếp tục chọn món</Link>
        <Link href="/orders">Lịch sử đơn hàng</Link>
      </div>
    </div>
  );
}
