import { AdminDashboard } from '@/components/AdminDashboard';

export const metadata = { title: 'Quản trị — BrewLite' };

export default function AdminPage() {
  return (
    <section className="container">
      <h1 className="section-title page-title">Quản trị</h1>
      <AdminDashboard />
    </section>
  );
}
