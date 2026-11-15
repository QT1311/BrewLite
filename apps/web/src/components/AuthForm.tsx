'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { safeRedirect } from '@/lib/redirect';

type Mode = 'login' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';
  const target = safeRedirect(next);
  const query = target !== '/' ? `?next=${encodeURIComponent(target)}` : '';

  function validate(): string | null {
    if (isRegister && !name.trim()) return 'Vui lòng nhập tên';
    if (!EMAIL_RE.test(email.trim())) return 'Email không hợp lệ';
    if (isRegister && password.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
    if (!password) return 'Vui lòng nhập mật khẩu';
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      if (isRegister) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <h1>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
      {isRegister && (
        <label>
          Tên hiển thị
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Mật khẩu
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-lg" type="submit" disabled={busy}>
        {busy ? 'Đang xử lý…' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
      </button>
      <p className="form-alt">
        {isRegister ? (
          <>Đã có tài khoản? <Link href={`/login${query}`}>Đăng nhập</Link></>
        ) : (
          <>Chưa có tài khoản? <Link href={`/register${query}`}>Đăng ký</Link></>
        )}
      </p>
    </form>
  );
}
