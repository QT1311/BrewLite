import Link from 'next/link';
import { Product, priceLabel } from '@/lib/api';

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;
  return (
    <Link href={`/products/${product.id}`} className="card-link">
      <article className="card" data-testid="product-card">
        <div className="card-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl ?? '/images/placeholder.svg'} alt={product.name} loading="lazy" />
          {soldOut && <span className="badge">Hết hàng</span>}
        </div>
        <div className="card-body">
          <h3>{product.name}</h3>
          <p className="desc">{product.description}</p>
          <div className="card-foot">
            <p className="price">{priceLabel(product)}</p>
            <span className="card-add" aria-hidden="true">+</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
