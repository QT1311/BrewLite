'use client';

import { useState } from 'react';
import { AdminOrders } from './AdminOrders';
import { AdminOverview } from './AdminOverview';
import { AdminProducts } from './AdminProducts';
import { AdminStaff } from './AdminStaff';
import { RoleGate } from './RoleGate';

const TABS = [
  { id: 'overview', label: 'Doanh thu' },
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'products', label: 'Món & tồn kho' },
  { id: 'staff', label: 'Nhân viên' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function Dashboard({ token, logout }: { token: string; logout: () => void }) {
  const [tab, setTab] = useState<TabId>('overview');
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Mục quản trị">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && <AdminOverview token={token} logout={logout} />}
        {tab === 'orders' && <AdminOrders token={token} logout={logout} />}
        {tab === 'products' && <AdminProducts token={token} logout={logout} />}
        {tab === 'staff' && <AdminStaff token={token} logout={logout} />}
      </div>
    </>
  );
}

export function AdminDashboard() {
  return <RoleGate roles={['admin']} next="/admin">{({ token, logout }) => <Dashboard token={token} logout={logout} />}</RoleGate>;
}
