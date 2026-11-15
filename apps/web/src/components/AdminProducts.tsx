'use client';

import { useEffect, useState } from 'react';
import { AdminProduct, ApiError, CATEGORY_LABELS, fetchAdminProducts, formatVND, updateAdminProduct } from '@/lib/api';

export function AdminProducts({ token, logout }: { token: string; logout: () => void }) {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [stockInput, setStockInput] = useState<Record<number, string>>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    fetchAdminProducts(token)
      .then((list) => {
        setProducts(list.filter((p) => p.category !== 'archived'));
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được danh sách món');
      });
  }, [token, logout]);

  async function save(p: AdminProduct, body: { stock?: number; isActive?: boolean }) {
    setBusyId(p.id);
    setError(null);
    try {
      const updated = await updateAdminProduct(token, p.id, body);
      setProducts((cur) => cur?.map((x) => (x.id === p.id ? { ...x, ...updated } : x)) ?? cur);
      setStockInput((cur) => {
        const { [p.id]: _drop, ...rest } = cur;
        return rest;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return logout();
      setError(err instanceof Error ? err.message : 'Không cập nhật được món');
    } finally {
      setBusyId(null);
    }
  }

  if (!products) {
    return error ? <p className="form-error" role="alert">{error}</p> : <div className="detail skeleton" role="status" aria-label="Đang tải món" />;
  }
  const q = query.trim().toLowerCase();
  const shown = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;

  return (
    <div className="admin-section">
      <input className="search" placeholder="Tìm món…" aria-label="Tìm món" value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <ul className="history">
        {shown.map((p) => {
          const draft = stockInput[p.id];
          const value = draft ?? String(p.stock);
          const parsed = Number(value);
          const valid = value.trim() !== '' && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100000;
          return (
            <li key={p.id} className={`history-row admin-product${p.isActive ? '' : ' is-off'}`} data-testid="admin-product">
              <div>
                <strong>{p.name}</strong>
                <small>{CATEGORY_LABELS[p.category] ?? p.category} · từ {formatVND(p.price)}</small>
              </div>
              <div className="admin-actions">
                <label>
                  <span className="sr-only">Tồn kho {p.name}</span>
                  <input
                    type="number" min={0} max={100000} inputMode="numeric" value={value}
                    onChange={(e) => setStockInput((cur) => ({ ...cur, [p.id]: e.target.value }))}
                    aria-label={`Tồn kho ${p.name}`}
                  />
                </label>
                <button className="btn" disabled={busyId === p.id || draft === undefined || !valid} onClick={() => void save(p, { stock: parsed })}>Lưu</button>
                <button className="btn btn-secondary" disabled={busyId === p.id} onClick={() => void save(p, { isActive: !p.isActive })}>
                  {p.isActive ? 'Ngưng bán' : 'Bán lại'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="board-hint">Giá món được cập nhật theo thực đơn gốc của hệ thống, không sửa ở đây.</p>
    </div>
  );
}
