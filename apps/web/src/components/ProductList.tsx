'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_ORDER, Product, fetchProducts } from '@/lib/api';
import { ProductCard } from './ProductCard';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[] };

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
}

export function ProductList({ initialCategory }: { initialCategory?: string } = {}) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [category, setCategory] = useState(initialCategory ?? 'all');
  const [query, setQuery] = useState('');

  const products = state.status === 'ready' ? state.products : null;
  const categories = useMemo(() => {
    const present = Array.from(new Set((products ?? []).map((p) => p.category)));
    const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
    return present.sort((a, b) => rank(a) - rank(b));
  }, [products]);
  // Nhóm mở từ trang mở đầu (?nhom=…) mà không còn món nào thì quay về "Tất cả".
  const activeCategory = category === 'all' || products === null || categories.includes(category) ? category : 'all';
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return (products ?? []).filter(
      (p) =>
        (activeCategory === 'all' || p.category === activeCategory) &&
        (q === '' || normalize(`${p.name} ${p.description}`).includes(q)),
    );
  }, [products, activeCategory, query]);
  // Xem "Tất cả" mà chưa tìm kiếm: chia theo từng loại có tiêu đề; còn lại: một lưới phẳng.
  const showHeadings = activeCategory === 'all' && query.trim() === '';
  const groups: [string, Product[]][] = showHeadings
    ? categories.map((c) => [c, visible.filter((p) => p.category === c)] as [string, Product[]]).filter(([, l]) => l.length)
    : [[activeCategory, visible]];

  const load = useCallback(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetchProducts(controller.signal)
      .then((products) => setState({ status: 'ready', products }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Không thể tải thực đơn',
        });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => load(), [load]);

  if (state.status === 'loading') {
    return (
      <div className="grid" role="status" aria-label="Đang tải thực đơn">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card skeleton" data-testid="skeleton" />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="state-box" role="alert">
        <h2>Không tải được thực đơn</h2>
        <p>{state.message}. Hãy kiểm tra API đã chạy chưa rồi thử lại.</p>
        <button className="btn" onClick={() => load()}>
          Thử lại
        </button>
      </div>
    );
  }

  if (state.products.length === 0) {
    return (
      <div className="state-box">
        <h2>Thực đơn đang trống</h2>
        <p>Hiện chưa có đồ uống nào. Vui lòng quay lại sau nhé.</p>
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <div className="chip-row" role="group" aria-label="Lọc theo nhóm">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              type="button"
              className={`chip-btn${activeCategory === c ? ' on' : ''}`}
              aria-pressed={activeCategory === c}
              onClick={() => setCategory(c)}
            >
              {c === 'all' ? 'Tất cả' : (CATEGORY_LABELS[c] ?? c)}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="search"
          placeholder="Tìm món…"
          aria-label="Tìm món"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {visible.length === 0 ? (
        <div className="state-box">
          <h2>Không tìm thấy món phù hợp</h2>
          <p>Thử đổi từ khoá hoặc chọn nhóm khác nhé.</p>
        </div>
      ) : (
        groups.map(([c, list]) => (
          <section key={c} className="menu-group" aria-label={CATEGORY_LABELS[c] ?? c}>
            {showHeadings && (
              <h3 className="group-title">
                {CATEGORY_LABELS[c] ?? c} <span>{list.length}</span>
              </h3>
            )}
            <div className="grid">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
