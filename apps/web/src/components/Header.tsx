import Link from 'next/link';
import { AuthLink } from './AuthLink';
import { CartLink } from './CartLink';

export function Header() {
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="brand" aria-label="BrewLite — trang chủ">
          <span className="brand-mark" aria-hidden="true">b</span>
          <span className="brand-word">BrewLite</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <Link href="/#menu" className="nav-home">Thực đơn</Link>
          <Link href="/#how" className="nav-how">Cách hoạt động</Link>
          <CartLink />
          <AuthLink />
        </nav>
      </div>
    </header>
  );
}
