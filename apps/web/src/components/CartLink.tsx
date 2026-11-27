'use client';

import Link from 'next/link';
import { useCart } from '@/lib/CartContext';

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="cart-link" aria-label={`Giỏ hàng, ${count} món`}>
      Giỏ hàng
      {/* key đổi theo số món để huy hiệu chạy lại hiệu ứng mỗi khi giỏ thay đổi */}
      {count > 0 && <span key={count} className="cart-badge" data-testid="cart-badge">{count}</span>}
    </Link>
  );
}
