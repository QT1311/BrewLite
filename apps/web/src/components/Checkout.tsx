'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, Order, PaymentMethod, cancelOrder, fetchOrder, formatVND, payOrder } from '@/lib/api';
import { useCart } from '@/lib/CartContext';
import { PAYABLE, describeLine, newIdempotencyKey } from '@/lib/orders';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { StatusBadge } from './StatusBadge';

const METHODS: { code: PaymentMethod; label: string; hint: string }[] = [
  { code: 'EWALLET', label: 'Ví điện tử', hint: 'Momo / ZaloPay (giả lập)' },
  { code: 'CARD', label: 'Thẻ ngân hàng', hint: 'ATM / Visa (giả lập)' },
];

export function Checkout({ id }: { id: number }) {
  const { status, token, logout } = useRequireAuth(`/checkout/${id}`);
  const { clear } = useCart();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('EWALLET');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Idempotency-Key của lần thanh toán hiện tại.
   * - Giữ nguyên khi lỗi mạng → bấm lại sẽ không trừ tiền 2 lần.
   * - Đổi key mới sau khi server đã trả kết quả (thành công/thất bại).
   */
  const keyRef = useRef<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.replace(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);
        return true;
      }
      return false;
    },
    [id, logout, router],
  );

  useEffect(() => {
    if (status !== 'authed' || !token) return;
    fetchOrder(token, id)
      .then((o) => {
        if (!PAYABLE.includes(o.status)) router.replace(`/orders/${o.id}`);
        else setOrder(o);
      })
      .catch((err) => {
        if (!handleAuthError(err)) setLoadError(err instanceof Error ? err.message : 'Không tải được đơn hàng');
      });
  }, [status, token, id, router, handleAuthError]);

  async function onPay() {
    if (!token || !order || busy) return;
    setBusy(true);
    setError(null);
    keyRef.current ??= newIdempotencyKey();
    try {
      const res = await payOrder(token, keyRef.current, { orderId: order.id, method, simulateFailure });
      keyRef.current = null;
      if (res.status === 'SUCCEEDED') {
        clear();
        router.push(`/orders/${order.id}`);
        return;
      }
      setOrder({ ...order, status: res.orderStatus });
      setError(`${res.failureReason ?? 'Thanh toán thất bại'}. Giỏ hàng vẫn được giữ, bạn có thể thử lại.`);
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof ApiError && err.status !== 0) keyRef.current = null;
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    }
    setBusy(false);
  }

  async function onCancel() {
    if (!token || !order) return;
    setBusy(true);
    try {
      await cancelOrder(token, order.id);
      router.push('/cart');
    } catch (err) {
      if (!handleAuthError(err)) setError(err instanceof Error ? err.message : 'Không huỷ được đơn');
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="state-box" role="alert">
        <h2>Không mở được đơn hàng</h2>
        <p>{loadError}</p>
        <Link href="/cart" className="btn">Về giỏ hàng</Link>
      </div>
    );
  }
  if (!order) return <div className="detail skeleton" role="status" aria-label="Đang tải đơn hàng" />;

  return (
    <div className="checkout">
      <div className="panel">
        <div className="panel-head">
          <h2>Đơn #{order.id}</h2>
          <StatusBadge status={order.status} />
        </div>
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
        <div className="sum-row"><span>Tổng</span><strong data-testid="order-total">{formatVND(order.total)}</strong></div>
      </div>

      <div className="panel">
        <fieldset className="opt">
          <legend>Phương thức (không dùng tiền mặt)</legend>
          <div className="methods">
            {METHODS.map((m) => (
              <label key={m.code} className={`method ${method === m.code ? 'on' : ''}`}>
                <input type="radio" name="method" checked={method === m.code} onChange={() => setMethod(m.code)} />
                <span>{m.label}<small>{m.hint}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="demo-toggle">
          <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
          Giả lập thanh toán thất bại (demo)
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-lg full" onClick={onPay} disabled={busy}>
          {busy ? 'Đang xử lý…' : `Xác nhận trả ${formatVND(order.total)}`}
        </button>
        <button className="link-btn" onClick={onCancel} disabled={busy}>Huỷ đơn</button>
      </div>
    </div>
  );
}
