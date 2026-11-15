'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, StaffAccount, createStaffAccount, fetchStaffAccounts, setStaffActive } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminStaff({ token, logout }: { token: string; logout: () => void }) {
  const [list, setList] = useState<StaffAccount[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchStaffAccounts(token)
      .then(setList)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được danh sách nhân viên');
      });
  }, [token, logout]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Vui lòng nhập tên');
    if (!EMAIL_RE.test(email.trim())) return setError('Email không hợp lệ');
    if (password.length < 8) return setError('Mật khẩu tối thiểu 8 ký tự');
    setBusy(true);
    setError(null);
    try {
      const created = await createStaffAccount(token, { name: name.trim(), email: email.trim(), password });
      setList((cur) => [...(cur ?? []), created]);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không tạo được tài khoản');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: StaffAccount) {
    setError(null);
    try {
      const updated = await setStaffActive(token, s.id, !s.isActive);
      setList((cur) => cur?.map((x) => (x.id === s.id ? updated : x)) ?? cur);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không cập nhật được tài khoản');
    }
  }

  return (
    <div className="admin-section">
      <form className="auth-form staff-form" onSubmit={onCreate} noValidate>
        <h2>Tạo tài khoản nhân viên</h2>
        <label>Tên<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></label>
        <label>Mật khẩu ban đầu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo nhân viên'}</button>
      </form>

      <h2 className="admin-h">Danh sách nhân viên</h2>
      {!list && !error && <div className="detail skeleton" role="status" aria-label="Đang tải nhân viên" />}
      {list && list.length === 0 && <p className="board-empty">Chưa có nhân viên nào</p>}
      {list && list.length > 0 && (
        <ul className="history">
          {list.map((s) => (
            <li key={s.id} className={`history-row${s.isActive ? '' : ' is-off'}`} data-testid="staff-row">
              <div>
                <strong>{s.name}</strong>
                <small>{s.email} · {s.isActive ? 'Đang hoạt động' : 'Đã khoá'}</small>
              </div>
              <button className="btn btn-secondary" onClick={() => void toggle(s)}>{s.isActive ? 'Khoá' : 'Mở khoá'}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
