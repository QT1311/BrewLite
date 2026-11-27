'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CATEGORY_LABELS, Product, fetchProduct, formatVND, priceLabel } from '@/lib/api';
import { useCart } from '@/lib/CartContext';
import { unitPrice } from '@/lib/cart';
import { SIZES, SizeCode, TOPPINGS, availableSizes } from '@/lib/options';

type State =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; product: Product };

export function ProductDetail({ id }: { id: number }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [chosenSize, setChosenSize] = useState<SizeCode | null>(null);
  const [toppings, setToppings] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  const load = useCallback(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchProduct(id, controller.signal)
      .then((product) => setState({ status: 'ready', product }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.message === 'NOT_FOUND') setState({ status: 'notfound' });
        else setState({ status: 'error', message: err instanceof Error ? err.message : 'Không thể tải sản phẩm' });
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => load(), [load]);

  if (state.status === 'loading') {
    return <div className="detail skeleton" role="status" aria-label="Đang tải sản phẩm" data-testid="skeleton" />;
  }
  if (state.status === 'notfound') {
    return (
      <div className="state-box">
        <h2>Không tìm thấy sản phẩm</h2>
        <p>Sản phẩm này không tồn tại hoặc đã ngừng bán.</p>
        <Link href="/thuc-don" className="btn">Về thực đơn</Link>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="state-box" role="alert">
        <h2>Không tải được sản phẩm</h2>
        <p>{state.message}</p>
        <button className="btn" onClick={() => load()}>Thử lại</button>
      </div>
    );
  }

  const { product } = state;
  const soldOut = product.stock <= 0;
  const sizes = availableSizes(product.sizePrices);
  // Mặc định chọn size nhỏ nhất của món; món 1 cỡ thì không có size.
  const size: SizeCode | null = chosenSize && sizes.includes(chosenSize) ? chosenSize : (sizes[0] ?? null);
  const price = unitPrice(product, size, toppings);

  const toggleTopping = (code: string) =>
    setToppings((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const handleAdd = () => {
    add(product, size, toppings, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="detail">
      <div className="detail-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl ?? '/images/placeholder.svg'} alt={product.name} />
      </div>
      <div className="detail-body">
        <Link href="/thuc-don" className="back">← Thực đơn</Link>
        <p className="overline">{CATEGORY_LABELS[product.category] ?? product.category}</p>
        <h1>{product.name}</h1>
        <p className="detail-from">{priceLabel(product)}</p>
        <p className="desc">{product.description}</p>

        {sizes.length > 0 && (
          <fieldset className="opt">
            <legend>Chọn size</legend>
            <div className="chips">
              {SIZES.filter((s) => sizes.includes(s.code)).map((s) => (
                <label key={s.code} className={`chip ${size === s.code ? 'on' : ''}`}>
                  <input type="radio" name="size" checked={size === s.code} onChange={() => setChosenSize(s.code)} />
                  {s.label} · {formatVND(product.sizePrices![s.code])}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {product.allowToppings && (
          <fieldset className="opt">
            <legend>Topping</legend>
            <div className="chips">
              {TOPPINGS.map((t) => (
                <label key={t.code} className={`chip ${toppings.includes(t.code) ? 'on' : ''}`}>
                  <input type="checkbox" checked={toppings.includes(t.code)} onChange={() => toggleTopping(t.code)} />
                  {t.label} (+{formatVND(t.price)})
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="buy-row">
          <div className="qty" aria-label="Số lượng">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm">−</button>
            <span data-testid="qty">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Tăng">+</button>
          </div>
          <button className={`btn btn-lg${added ? ' is-added' : ''}`} onClick={handleAdd} disabled={soldOut}>
            {soldOut ? 'Hết hàng' : added ? 'Đã thêm ✓' : `Thêm vào giỏ · ${formatVND(price * qty)}`}
          </button>
        </div>
        <p className="unit-price" data-testid="unit-price">Đơn giá: {formatVND(price)}</p>
      </div>
    </div>
  );
}
