'use client';

import Link from 'next/link';
import { useCart } from '@/lib/CartContext';

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="cart-link" aria-label={`Giỏ hàng, ${count} món`}>
      Giỏ hàng
      {count > 0 && <span className="cart-badge" data-testid="cart-badge">{count}</span>}
    </Link>
  );
}
