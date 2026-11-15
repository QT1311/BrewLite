'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, OrderStatus, StaffAction, StaffOrder, advanceOrderStatus, fetchStaffQueue, formatVND } from '@/lib/api';
import { describeLine } from '@/lib/orders';
import { RoleGate } from './RoleGate';

const COLUMNS: Array<{ status: OrderStatus; title: string; action: StaffAction; label: string }> = [
  { status: 'PAID', title: 'Mới — chờ pha', action: 'PREPARING', label: 'Bắt đầu pha' },
  { status: 'PREPARING', title: 'Đang pha chế', action: 'READY', label: 'Xong, sẵn sàng' },
  { status: 'READY', title: 'Sẵn sàng giao', action: 'COMPLETED', label: 'Đã giao khách' },
];

const REFRESH_MS = 15000;

function Board({ token, logout }: { token: string; logout: () => void }) {
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await fetchStaffQueue(token));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không tải được danh sách đơn');
    }
  }, [token, logout]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function advance(order: StaffOrder, action: StaffAction) {
    setBusyId(order.id);
    try {
      await advanceOrderStatus(token, order.id, action);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không cập nhật được đơn');
      await load(); // đơn có thể đã được người khác xử lý, làm mới để hiển thị đúng
    } finally {
      setBusyId(null);
    }
  }

  if (!orders) {
    return error ? (
      <div className="state-box" role="alert"><h2>Có lỗi</h2><p>{error}</p><button className="btn" onClick={() => void load()}>Thử lại</button></div>
    ) : (
      <div className="detail skeleton" role="status" aria-label="Đang tải đơn" />
    );
  }

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="board-hint">Tự làm mới mỗi 15 giây · {orders.length} đơn đang xử lý</p>
      <div className="board">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="board-col" aria-label={col.title} data-testid={`col-${col.status}`}>
              <h2>{col.title} <span className="board-count">{list.length}</span></h2>
              {list.length === 0 && <p className="board-empty">Không có đơn</p>}
              {list.map((o) => (
                <article key={o.id} className="ticket" data-testid="ticket">
                  <header>
                    <strong>Đơn #{o.id}</strong>
                    <small>{new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {o.customerName}</small>
                  </header>
                  <ul>
                    {o.items.map((i) => (
                      <li key={i.id}>
                        <span>{i.quantity}× {i.name}</span>
                        {describeLine(i.size, i.toppings) && <small>{describeLine(i.size, i.toppings)}</small>}
                      </li>
                    ))}
                  </ul>
                  <footer>
                    <span className="price">{formatVND(o.total)}</span>
                    <button className="btn" disabled={busyId === o.id} onClick={() => void advance(o, col.action)}>
                      {busyId === o.id ? 'Đang cập nhật…' : col.label}
                    </button>
                  </footer>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function StaffBoard() {
  return <RoleGate roles={['staff', 'admin']} next="/staff">{({ token, logout }) => <Board token={token} logout={logout} />}</RoleGate>;
}
