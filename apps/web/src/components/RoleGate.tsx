'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { AuthUser, UserRole } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface Ctx {
  token: string;
  user: AuthUser;
  logout: () => void;
}

/** Chỉ hiển thị nội dung cho đúng vai trò; chưa đăng nhập thì chuyển sang trang đăng nhập. */
export function RoleGate({ roles, next, children }: { roles: UserRole[]; next: string; children: (ctx: Ctx) => ReactNode }) {
  const { status, user, token, logout } = useRequireAuth(next);
  if (status !== 'authed' || !user || !token) {
    return <div className="detail skeleton" role="status" aria-label="Đang tải" />;
  }
  if (!roles.includes(user.role)) {
    return (
      <div className="state-box" role="alert">
        <h2>Bạn không có quyền truy cập</h2>
        <p>Trang này chỉ dành cho {roles.includes('admin') && roles.length === 1 ? 'quản trị viên' : 'nhân viên'}.</p>
        <Link href="/" className="btn">Về trang chủ</Link>
      </div>
    );
  }
  return <>{children({ token, user, logout })}</>;
}
