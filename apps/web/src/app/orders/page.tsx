import { OrderHistory } from '@/components/OrderHistory';

export const metadata = { title: 'Lịch sử đơn — BrewLite' };

export default function OrdersPage() {
  return (
    <section className="container">
      <h1 className="section-title page-title">Lịch sử đơn hàng</h1>
      <OrderHistory />
    </section>
  );
}
