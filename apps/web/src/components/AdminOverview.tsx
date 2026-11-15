'use client';

import { useEffect, useState } from 'react';
import { ApiError, RevenueReport, fetchRevenue, formatVND } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/orders';

const RANGES = [7, 14, 30];

export function AdminOverview({ token, logout }: { token: string; logout: () => void }) {
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    fetchRevenue(token, days)
      .then((r) => !cancelled && (setReport(r), setError(null)))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return logout();
        setError(err instanceof Error ? err.message : 'Không tải được doanh thu');
      });
    return () => {
      cancelled = true;
    };
  }, [token, days, logout]);

  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!report) return <div className="detail skeleton" role="status" aria-label="Đang tải doanh thu" />;

  const max = Math.max(1, ...report.byDay.map((d) => d.revenue));
  return (
    <div className="admin-section">
      <div className="range-pick" role="group" aria-label="Khoảng thời gian">
        {RANGES.map((r) => (
          <button key={r} className={`chip-btn${r === days ? ' on' : ''}`} aria-pressed={r === days} onClick={() => setDays(r)}>
            {r} ngày
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat"><small>Doanh thu {report.days} ngày</small><strong data-testid="stat-revenue">{formatVND(report.totalRevenue)}</strong></div>
        <div className="stat"><small>Số đơn đã thanh toán</small><strong data-testid="stat-orders">{report.orderCount}</strong></div>
        <div className="stat"><small>Giá trị trung bình / đơn</small><strong>{formatVND(report.averageOrder)}</strong></div>
        <div className="stat"><small>Hôm nay</small><strong>{formatVND(report.today.revenue)}</strong><em>{report.today.orders} đơn</em></div>
      </div>

      <h2 className="admin-h">Doanh thu theo ngày</h2>
      <div className="bars" role="img" aria-label={`Biểu đồ doanh thu ${report.days} ngày gần nhất`}>
        {report.byDay.map((d) => (
          <div key={d.date} className="bar-col" title={`${d.date}: ${formatVND(d.revenue)} (${d.orders} đơn)`}>
            <div className="bar" style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }} />
            <small>{d.date.slice(8)}/{d.date.slice(5, 7)}</small>
          </div>
        ))}
      </div>

      <div className="admin-two">
        <div>
          <h2 className="admin-h">Món bán chạy</h2>
          {report.topProducts.length === 0 ? (
            <p className="board-empty">Chưa có đơn thanh toán trong khoảng này</p>
          ) : (
            <ol className="rank">
              {report.topProducts.map((p) => (
                <li key={p.name}><span>{p.name}</span><small>{p.quantity} ly · {formatVND(p.revenue)}</small></li>
              ))}
            </ol>
          )}
        </div>
        <div>
          <h2 className="admin-h">Đơn theo trạng thái (tất cả)</h2>
          <ul className="rank">
            {Object.entries(report.ordersByStatus).map(([s, n]) => (
              <li key={s}><span>{STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s}</span><small>{n}</small></li>
            ))}
          </ul>
        </div>
      </div>
      <p className="board-hint">Doanh thu chỉ tính các giao dịch thanh toán thành công, theo giờ Việt Nam.</p>
    </div>
  );
}
