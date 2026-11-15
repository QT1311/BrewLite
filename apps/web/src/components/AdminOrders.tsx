'use client';

import { useEffect, useState } from 'react';
import { ApiError, OrderStatus, StaffOrder, fetchAdminOrders, formatVND } from '@/lib/api';
import { STATUS_LABEL, describeLine } from '@/lib/orders';
import { StatusBadge } from './StatusBadge';

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

export function AdminOrders({ token, logout }: { token: string; logout: () => void }) {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrders(null);
    fetchAdminOrders(token, status || undefined)
      .then((o) => !cancelled && (setOrders(o), setError(null)))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được danh sách đơn');
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, logout]);

  return (
    <div className="admin-section">
      <label className="admin-filter">
        Lọc theo trạng thái
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">Tất cả</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!orders && !error && <div className="detail skeleton" role="status" aria-label="Đang tải đơn" />}
      {orders && orders.length === 0 && <p className="board-empty">Không có đơn nào</p>}
      {orders && orders.length > 0 && (
        <ul className="history">
          {orders.map((o) => (
            <li key={o.id} className="history-row admin-order" data-testid="admin-order">
              <div>
                <strong>Đơn #{o.id}</strong>
                <small>{new Date(o.createdAt).toLocaleString('vi-VN')} · {o.customerName} ({o.customerEmail})</small>
                <small>{o.items.map((i) => `${i.quantity}× ${i.name}${describeLine(i.size, i.toppings) ? ` (${describeLine(i.size, i.toppings)})` : ''}`).join(', ')}</small>
              </div>
              <div className="history-right">
                <StatusBadge status={o.status} />
                <span className="price">{formatVND(o.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="board-hint">Hiển thị tối đa 100 đơn mới nhất.</p>
    </div>
  );
}
