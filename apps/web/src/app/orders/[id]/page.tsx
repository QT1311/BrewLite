import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/OrderDetail';

export const metadata = { title: 'Đơn hàng — BrewLite' };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <section className="container">
      <OrderDetail id={id} />
    </section>
  );
}
