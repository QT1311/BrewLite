import { notFound } from 'next/navigation';
import { Checkout } from '@/components/Checkout';

export const metadata = { title: 'Thanh toán — BrewLite' };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <section className="container">
      <h1 className="section-title page-title">Thanh toán</h1>
      <Checkout id={id} />
    </section>
  );
}
