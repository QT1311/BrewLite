'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  AdminPromotion, ApiError, NewPromotion, createAdminPromotion, fetchAdminPromotions, formatVND, updateAdminPromotion,
} from '@/lib/api';

const CODE_RE = /^[A-Za-z0-9_-]{3,30}$/;

function describe(p: AdminPromotion): string {
  const base = p.discountType === 'PERCENT' ? `Giảm ${p.value}%` : `Giảm ${formatVND(p.value)}`;
  const cap = p.discountType === 'PERCENT' && p.maxDiscount ? `, tối đa ${formatVND(p.maxDiscount)}` : '';
  const min = p.minOrderTotal > 0 ? `, đơn từ ${formatVND(p.minOrderTotal)}` : '';
  return base + cap + min;
}

function usage(p: AdminPromotion): string {
  return `${p.usedCount}/${p.maxUses ?? '∞'} lượt`;
}

export function AdminPromotions({ token, logout }: { token: string; logout: () => void }) {
  const [list, setList] = useState<AdminPromotion[] | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expires, setExpires] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAdminPromotions(token)
      .then(setList)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được danh sách khuyến mãi');
      });
  }, [token, logout]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const v = Number(value);
    if (!CODE_RE.test(code.trim())) return setError('Mã gồm 3–30 ký tự chữ, số, - hoặc _');
    if (!Number.isInteger(v) || v < 1) return setError('Giá trị giảm phải là số nguyên lớn hơn 0');
    if (type === 'PERCENT' && v > 90) return setError('Giảm theo phần trăm tối đa 90%');
    const body: NewPromotion = { code: code.trim(), discountType: type, value: v };
    if (description.trim()) body.description = description.trim();
    if (minOrder) body.minOrderTotal = Number(minOrder);
    if (type === 'PERCENT' && maxDiscount) body.maxDiscount = Number(maxDiscount);
    if (maxUses) body.maxUses = Number(maxUses);
    if (expires) body.expiresAt = new Date(`${expires}T23:59:59`).toISOString();
    setBusy(true);
    setError(null);
    try {
      const created = await createAdminPromotion(token, body);
      setList((cur) => [created, ...(cur ?? [])]);
      setCode('');
      setDescription('');
      setValue('');
      setMinOrder('');
      setMaxDiscount('');
      setMaxUses('');
      setExpires('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không tạo được mã khuyến mãi');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p: AdminPromotion) {
    setError(null);
    try {
      const updated = await updateAdminPromotion(token, p.id, { isActive: !p.isActive });
      setList((cur) => cur?.map((x) => (x.id === p.id ? updated : x)) ?? cur);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không cập nhật được mã');
    }
  }

  return (
    <div className="admin-section">
      <form className="auth-form staff-form" onSubmit={onCreate} noValidate>
        <h2>Tạo mã khuyến mãi</h2>
        <label>Mã<input value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} autoComplete="off" placeholder="VD: CHAOHE10" /></label>
        <label>Mô tả<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} autoComplete="off" /></label>
        <label>Loại giảm giá
          <select value={type} onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}>
            <option value="PERCENT">Theo phần trăm (%)</option>
            <option value="FIXED">Số tiền cố định (đ)</option>
          </select>
        </label>
        <label>{type === 'PERCENT' ? 'Phần trăm giảm (1–90)' : 'Số tiền giảm (đ)'}
          <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label>Đơn tối thiểu (đ, tuỳ chọn)
          <input inputMode="numeric" value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/\D/g, ''))} />
        </label>
        {type === 'PERCENT' && (
          <label>Giảm tối đa (đ, tuỳ chọn)
            <input inputMode="numeric" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value.replace(/\D/g, ''))} />
          </label>
        )}
        <label>Số lượt dùng tối đa (tuỳ chọn)
          <input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label>Hạn dùng (tuỳ chọn)<input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo mã'}</button>
      </form>

      <h2 className="admin-h">Danh sách mã khuyến mãi</h2>
      {!list && !error && <div className="detail skeleton" role="status" aria-label="Đang tải khuyến mãi" />}
      {list && list.length === 0 && <p className="board-empty">Chưa có mã khuyến mãi nào</p>}
      {list && list.length > 0 && (
        <ul className="history">
          {list.map((p) => (
            <li key={p.id} className={`history-row${p.isActive ? '' : ' is-off'}`} data-testid="promo-row">
              <div>
                <strong>{p.code}</strong>
                <small>
                  {describe(p)} · {usage(p)}
                  {p.expiresAt ? ` · hạn ${new Date(p.expiresAt).toLocaleDateString('vi-VN')}` : ''}
                  {' · '}{p.isActive ? 'Đang bật' : 'Đã tắt'}
                </small>
              </div>
              <button className="btn btn-secondary" onClick={() => void toggle(p)}>{p.isActive ? 'Tắt' : 'Bật'}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
