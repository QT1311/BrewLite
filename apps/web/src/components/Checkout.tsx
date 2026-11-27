'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError, MIN_REDEEM_POINTS, Order, PaymentMethod, VND_PER_REDEEM_POINT, applyPromotion, cancelOrder, fetchLoyalty, fetchOrder,
  formatVND, payOrder, removePoints, removePromotion, redeemPoints,
} from '@/lib/api';
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
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  /** Số điểm thưởng hiện có của khách (null = chưa tải được). */
  const [balance, setBalance] = useState<number | null>(null);
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

  const refreshBalance = useCallback(() => {
    if (!token) return;
    fetchLoyalty(token).then((l) => setBalance(l.points)).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (status === 'authed') refreshBalance();
  }, [status, refreshBalance]);

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

  /** Áp/gỡ mã khuyến mãi hoặc điểm thưởng; server tính lại tổng tiền nên UI chỉ hiển thị kết quả server trả về. */
  async function changeDiscount(action: () => Promise<Order>, failMessage: string, setErr: (m: string | null) => void) {
    if (!token || busy || promoBusy) return;
    setPromoBusy(true);
    setErr(null);
    try {
      setOrder(await action());
      setPromoInput('');
      refreshBalance();
    } catch (err) {
      if (!handleAuthError(err)) setErr(err instanceof Error ? err.message : failMessage);
    } finally {
      setPromoBusy(false);
    }
  }

  function onApplyPromo(e: FormEvent) {
    e.preventDefault();
    const code = promoInput.trim();
    if (!order || !token || !code) return;
    void changeDiscount(() => applyPromotion(token, order.id, code), 'Không áp dụng được mã', setPromoError);
  }

  function onRemovePromo() {
    if (!order || !token) return;
    void changeDiscount(() => removePromotion(token, order.id), 'Không gỡ được mã', setPromoError);
  }

  function onUsePoints() {
    if (!order || !token) return;
    void changeDiscount(() => redeemPoints(token, order.id), 'Không dùng được điểm', setPointsError);
  }

  function onRemovePoints() {
    if (!order || !token) return;
    void changeDiscount(() => removePoints(token, order.id), 'Không bỏ dùng được điểm', setPointsError);
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
        <div className="promo">
          {order.promotionCode ? (
            <div className="promo-applied" data-testid="promo-applied">
              <span>Mã <strong>{order.promotionCode}</strong> đã áp dụng</span>
              <button type="button" className="link-btn" onClick={onRemovePromo} disabled={promoBusy}>Gỡ mã</button>
            </div>
          ) : (
            <form className="promo-form" onSubmit={onApplyPromo}>
              <input
                aria-label="Mã khuyến mãi"
                placeholder="Nhập mã khuyến mãi"
                value={promoInput}
                maxLength={30}
                autoComplete="off"
                onChange={(e) => setPromoInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" disabled={promoBusy || !promoInput.trim()}>Áp dụng</button>
            </form>
          )}
          {promoError && <p className="form-error" role="alert">{promoError}</p>}
        </div>
        <div className="points-box" data-testid="points-box">
          {order.pointsRedeemed > 0 ? (
            <div className="promo-applied" data-testid="points-applied">
              <span>Đã dùng <strong>{order.pointsRedeemed}</strong> điểm</span>
              <button type="button" className="link-btn" onClick={onRemovePoints} disabled={promoBusy}>Bỏ dùng điểm</button>
            </div>
          ) : (
            <>
              <div className="points-row">
                <span>
                  Điểm thưởng: <strong data-testid="points-balance">{balance ?? '…'}</strong>{' '}
                  <small>(1 điểm = {formatVND(VND_PER_REDEEM_POINT)})</small>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onUsePoints}
                  disabled={promoBusy || balance === null || balance < MIN_REDEEM_POINTS}
                >
                  Dùng điểm
                </button>
              </div>
              {balance !== null && balance < MIN_REDEEM_POINTS && (
                <p className="muted small" data-testid="points-hint">
                  Cần tối thiểu {MIN_REDEEM_POINTS} điểm ({formatVND(MIN_REDEEM_POINTS * VND_PER_REDEEM_POINT)}) để đổi điểm.
                </p>
              )}
            </>
          )}
          {pointsError && <p className="form-error" role="alert">{pointsError}</p>}
        </div>
        {(order.discountAmount > 0 || order.pointsDiscount > 0) && (
          <>
            <div className="sum-row sum-sub"><span>Tạm tính</span><span>{formatVND(order.total + order.discountAmount + order.pointsDiscount)}</span></div>
            {order.discountAmount > 0 && (
              <div className="sum-row sum-sub"><span>Giảm giá</span><span data-testid="order-discount">−{formatVND(order.discountAmount)}</span></div>
            )}
            {order.pointsDiscount > 0 && (
              <div className="sum-row sum-sub"><span>Điểm thưởng ({order.pointsRedeemed} điểm)</span><span data-testid="order-points-discount">−{formatVND(order.pointsDiscount)}</span></div>
            )}
          </>
        )}
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
