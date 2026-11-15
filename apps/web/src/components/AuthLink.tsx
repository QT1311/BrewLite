'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export function AuthLink() {
  const { status, user, logout } = useAuth();
  if (status === 'loading') return <span className="cart-link" aria-hidden="true">&nbsp;</span>;
  if (status === 'anon') return <Link href="/login" className="cart-link">Đăng nhập</Link>;
  return (
    <>
      <Link href="/orders" className="cart-link">Đơn hàng</Link>
      <span className="user-chip" data-testid="user-name">{user?.name}</span>
      <button className="link-btn" onClick={logout}>Đăng xuất</button>
    </>
  );
}
