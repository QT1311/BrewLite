import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/fraunces/standard-italic.css';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/lib/AuthContext';
import { CartProvider } from '@/lib/CartContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite — Đặt đồ uống không tiền mặt',
  description: 'Xem menu, đặt và thanh toán đồ uống nhanh chóng từ điện thoại.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c0a10' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main>{children}</main>
            <footer className="site-footer">
              <div className="site-footer-inner">
                <Link href="/" className="brand">
                  <span className="brand-mark" aria-hidden="true">b</span>
                  <span className="brand-word">BrewLite</span>
                </Link>
                <p>© 2026 BrewLite · Đồ án Công nghệ phần mềm — Đại học Sài Gòn</p>
              </div>
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
