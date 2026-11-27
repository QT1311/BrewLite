import { ProductList } from '@/components/ProductList';

export const metadata = { title: 'Thực đơn — BrewLite' };

const STEPS = [
  { n: '1', title: 'Chọn và tuỳ chỉnh', text: 'Chọn món, size S/M/L và topping. Giá được hệ thống tính chính xác.' },
  { n: '2', title: 'Thanh toán', text: 'Thanh toán không tiền mặt an toàn, có thể thử lại nếu giao dịch lỗi.' },
  { n: '3', title: 'Nhận đồ uống', text: 'Theo dõi trạng thái đơn theo thời gian thực và ghé quầy khi sẵn sàng.' },
];

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ nhom?: string }> }) {
  const { nhom } = await searchParams;
  return (
    <>
      <section id="menu" className="section container" aria-labelledby="menu-title">
        <header className="section-head">
          <h1 id="menu-title" className="page-title">Thực đơn</h1>
        </header>
        <ProductList initialCategory={nhom} />
      </section>

      <section id="how" className="how-section" aria-labelledby="how-title">
        <div className="container">
          <header className="section-head">
            <h2 id="how-title" className="display-sm">Ba bước, không cần xếp hàng</h2>
          </header>
          <ol className="how-grid">
            {STEPS.map((s) => (
              <li key={s.n} className="how-card">
                <span className="how-num">Bước {s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
