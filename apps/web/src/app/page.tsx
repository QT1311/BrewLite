import Link from 'next/link';
import { ProductList } from '@/components/ProductList';

const STEPS = [
  { n: '01', title: 'Chọn & tuỳ chỉnh', text: 'Chọn món, size S/M/L và topping. Giá được hệ thống tính chính xác.' },
  { n: '02', title: 'Thanh toán', text: 'Thanh toán không tiền mặt an toàn, có thể thử lại nếu giao dịch lỗi.' },
  { n: '03', title: 'Nhận đồ uống', text: 'Theo dõi trạng thái đơn theo thời gian thực và ghé quầy khi sẵn sàng.' },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="overline">Đặt trước · Thanh toán không tiền mặt</p>
          <h1 className="display">
            Một ly ngon,
            <br />
            <em>chạm là có.</em>
          </h1>
          <p className="lead">
            Chọn món, tuỳ chỉnh size và topping, thanh toán trong vài giây — quầy pha chế sẽ báo ngay khi ly của
            bạn sẵn sàng.
          </p>
          <div className="hero-actions">
            <Link href="/#menu" className="btn btn-lg">Xem thực đơn</Link>
            <Link href="/#how" className="btn btn-lg btn-secondary">Cách hoạt động</Link>
          </div>
          <dl className="hero-stats">
            <div><dt>5 phút</dt><dd>thời gian chuẩn bị</dd></div>
            <div><dt>100%</dt><dd>giá tính bởi hệ thống</dd></div>
            <div><dt>24/7</dt><dd>đặt món mọi lúc</dd></div>
          </dl>
        </div>
        <div className="hero-art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cappuccino.svg" alt="" width={460} height={460} />
        </div>
      </section>

      <section id="menu" className="section container" aria-labelledby="menu-title">
        <header className="section-head">
          <p className="overline">Thực đơn</p>
          <h2 id="menu-title" className="display-sm">Hôm nay bạn muốn uống gì?</h2>
        </header>
        <ProductList />
      </section>

      <section id="how" className="how-section" aria-labelledby="how-title">
        <div className="container">
          <header className="section-head">
            <p className="overline">Cách hoạt động</p>
            <h2 id="how-title" className="display-sm">Ba bước, không cần xếp hàng</h2>
          </header>
          <ol className="how-grid">
            {STEPS.map((s) => (
              <li key={s.n} className="how-card">
                <span className="how-num">{s.n}</span>
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
