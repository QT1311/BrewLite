'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';

/** Chuyển sang trang đăng nhập nếu chưa đăng nhập (giữ lại trang hiện tại để quay về). */
export function useRequireAuth(next: string) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.status === 'anon') router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [auth.status, next, router]);
  return auth;
}
