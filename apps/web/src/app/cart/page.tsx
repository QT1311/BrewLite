import { CartView } from '@/components/CartView';

export const metadata = { title: 'Giỏ hàng — BrewLite' };

export default function CartPage() {
  return (
    <section className="container">
      <h1 className="section-title" style={{ marginTop: 40 }}>Giỏ hàng</h1>
      <CartView />
    </section>
  );
}
