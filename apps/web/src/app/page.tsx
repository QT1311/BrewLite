import Link from 'next/link';
import { CATEGORY_LABELS } from '@/lib/api';

/** Trang mở đầu: mỗi nhóm đồ uống một dải lớn; nút ở mỗi dải mở thực đơn đã lọc sẵn nhóm đó. */
const BANDS: { code: string; image: string; text: string }[] = [
  {
    code: 'ca-phe',
    image: '/images/menu/cafe-sua.webp',
    text: 'Cà phê pha phin đậm vị, uống đen hoặc với sữa đặc. Thích nhẹ hơn thì có americano, latte và cappuccino.',
  },
  {
    code: 'tra',
    image: '/images/menu/tra-thach-dao.webp',
    text: 'Trà sen, trà đào, trà vải ăn kèm thạch và trái cây. Vị thanh, uống mát được cả ngày.',
  },
  {
    code: 'matcha',
    image: '/images/menu/matcha-latte.webp',
    text: 'Matcha Nhật pha sữa tươi béo nhẹ, hoặc phủ thêm lớp kem dừa cho ai thích đậm đà.',
  },
  {
    code: 'da-xay',
    image: '/images/menu/socola-da-xay.webp',
    text: 'Xay mịn cùng đá, phủ kem và sốt. Hợp nhất cho những buổi trưa nóng.',
  },
  {
    code: 'khac',
    image: '/images/menu/chanh-day.webp',
    text: 'Chanh dây, chanh đá chua nhẹ và không có caffeine, dành cho lúc chỉ muốn giải khát.',
  },
  {
    code: 'banh',
    image: '/images/menu/banh-tiramisu.webp',
    text: 'Bánh phô mai, tiramisu, croissant và su kem để ăn kèm ly nước của bạn.',
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="landing-intro" aria-labelledby="landing-title">
        <div>
          <h1 id="landing-title" className="display">
            <span className="line">Đặt trước ly của bạn,</span>{' '}
            <span className="line">tới quầy là có.</span>
          </h1>
          <p className="lead">
            Chọn món, size và topping, thanh toán bằng ví hoặc thẻ. Quầy pha chế nhận đơn ngay và báo khi ly của bạn
            sẵn sàng.
          </p>
          <div className="hero-actions">
            <Link href="/thuc-don" className="btn btn-lg">Bắt đầu đặt món</Link>
          </div>
          <nav className="landing-jump" aria-label="Các nhóm đồ uống">
            {BANDS.map((b) => (
              <a key={b.code} href={`#${b.code}`}>{CATEGORY_LABELS[b.code]}</a>
            ))}
          </nav>
        </div>
        <div className="landing-strip" aria-hidden="true">
          {/* eslint-disable @next/next/no-img-element */}
          <img src="/images/menu/bac-xiu.webp" alt="" />
          <img src="/images/menu/tra-sen-vang-cu-nang.webp" alt="" />
          <img src="/images/menu/matcha-dua-may.webp" alt="" />
          {/* eslint-enable @next/next/no-img-element */}
        </div>
      </section>

      {BANDS.map((b, i) => {
        const label = CATEGORY_LABELS[b.code];
        return (
          <section
            key={b.code}
            id={b.code}
            className={`band band-${b.code}${i % 2 === 1 ? ' band-flip' : ''}`}
            aria-labelledby={`band-${b.code}-title`}
          >
            <div className="band-inner">
              <div className="band-copy">
                <h2 id={`band-${b.code}-title`}>{label}</h2>
                <p>{b.text}</p>
                <Link href={`/thuc-don?nhom=${b.code}`} className="btn btn-lg">
                  Xem {label.toLowerCase()}
                </Link>
              </div>
              <div className="band-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={label} loading={i < 2 ? 'eager' : 'lazy'} />
              </div>
            </div>
          </section>
        );
      })}

      <section className="landing-end">
        <div className="container" style={{ paddingBottom: 0 }}>
          <h2>Sẵn sàng gọi món?</h2>
          <p>Xem toàn bộ thực đơn, chọn size và topping, rồi thanh toán trong vài bước.</p>
          <Link href="/thuc-don" className="btn btn-lg">Bắt đầu đặt món</Link>
        </div>
      </section>
    </>
  );
}
