import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/ProductDetail';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) notFound();
  return (
    <section className="container">
      <ProductDetail id={numeric} />
    </section>
  );
}
