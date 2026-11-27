'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, createOrder, formatVND } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { SIZES, TOPPINGS } from '@/lib/options';

export function CartView() {
  const { items, total, setQty, remove, clear } = useCart();
  const { status, token, logout } = useAuth();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    if (!token || placing) return;
    setPlacing(true);
    setError(null);
    try {
      const order = await createOrder(
        token,
        items.map((i) => ({ productId: i.productId, size: i.size, toppings: i.toppings, quantity: i.quantity })),
      );
      router.push(`/checkout/${order.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.push('/login?next=%2Fcart');
        return;
      }
      setError(err instanceof Error ? err.message : 'Không tạo được đơn hàng');
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="state-box">
        <h2>Giỏ hàng trống</h2>
        <p>Hãy chọn vài món đồ uống từ thực đơn nhé.</p>
        <Link href="/thuc-don" className="btn">Xem thực đơn</Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <ul className="cart-list">
        {items.map((it) => {
          const sizeLabel = it.size ? (SIZES.find((s) => s.code === it.size)?.label ?? it.size) : null;
          const topLabels = it.toppings.map((c) => TOPPINGS.find((t) => t.code === c)?.label ?? c);
          return (
            <li key={it.key} className="cart-row" data-testid="cart-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl ?? '/images/placeholder.svg'} alt="" />
              <div className="cart-info">
                <h3>{it.name}</h3>
                <p className="desc">{[sizeLabel, ...topLabels].filter(Boolean).join(' · ')}</p>
                <p className="price">{formatVND(it.unitPrice)}</p>
              </div>
              <div className="cart-actions">
                <div className="qty">
                  <button onClick={() => setQty(it.key, it.quantity - 1)} aria-label={`Giảm ${it.name}`}>−</button>
                  <span data-testid="row-qty">{it.quantity}</span>
                  <button onClick={() => setQty(it.key, it.quantity + 1)} aria-label={`Tăng ${it.name}`}>+</button>
                </div>
                <button className="link-btn" onClick={() => remove(it.key)}>Xoá</button>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="cart-summary">
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="sum-row"><span>Tổng cộng</span><strong data-testid="cart-total">{formatVND(total)}</strong></div>
        {status === 'authed' ? (
          <button className="btn btn-lg" onClick={placeOrder} disabled={placing}>
            {placing ? 'Đang tạo đơn…' : 'Đặt đơn'}
          </button>
        ) : (
          <Link href="/login?next=%2Fcart" className="btn btn-lg" style={{ textAlign: 'center' }}>
            Đăng nhập để đặt đơn
          </Link>
        )}
        <button className="link-btn" onClick={clear}>Xoá toàn bộ giỏ</button>
      </aside>
    </div>
  );
}
