// Dữ liệu menu BrewLite (giá tính bằng đồng).
// sizePrices: giá theo từng size; null = món chỉ có 1 cỡ (giá cố định = price).
// price = giá thấp nhất, dùng để hiển thị "Từ …".
export const CATEGORY_ARCHIVED = 'archived';

type Size = Record<string, number> | null;
interface SeedProduct {
  name: string;
  description: string;
  price: number;
  sizePrices: Size;
  allowToppings: boolean;
  imageUrl: string;
  category: string;
  stock: number;
}

const img = (slug: string) => `/images/menu/${slug}.webp`;
const drink = (
  name: string, description: string, slug: string, category: string,
  sizePrices: Record<string, number>, allowToppings = false,
): SeedProduct => ({
  name, description, imageUrl: img(slug), category, sizePrices, allowToppings,
  price: Math.min(...Object.values(sizePrices)), stock: 50,
});
const single = (name: string, description: string, slug: string, category: string, price: number): SeedProduct => ({
  name, description, imageUrl: img(slug), category, sizePrices: null, allowToppings: false, price, stock: 30,
});

export const SEED_PRODUCTS: SeedProduct[] = [
  // Cà phê
  drink('Cafe sữa', 'Cà phê đậm vị pha cùng sữa đặc.', 'cafe-sua', 'ca-phe', { S: 29000, M: 39000, L: 45000 }),
  drink('Cafe đen', 'Cà phê nguyên chất, đậm đà và tỉnh táo.', 'cafe-den', 'ca-phe', { S: 29000, M: 35000, L: 39000 }),
  drink('Bạc xỉu', 'Nhiều sữa, ít cà phê — ngọt dịu dễ uống.', 'bac-xiu', 'ca-phe', { S: 29000, M: 39000, L: 45000 }),
  drink('Americano', 'Espresso pha loãng, vị thanh.', 'americano', 'ca-phe', { S: 45000, M: 49000, L: 55000 }),
  drink('Cafe latte', 'Espresso hoà cùng sữa tươi êm mượt.', 'cafe-latte', 'ca-phe', { S: 55000, M: 59000, L: 65000 }),
  drink('Cappuccino', 'Espresso, sữa nóng và lớp bọt sữa mịn.', 'cappuccino', 'ca-phe', { S: 55000, M: 59000, L: 65000 }),
  // Trà
  drink('Trà sen vàng (củ năng)', 'Trà sen thơm nhẹ cùng củ năng giòn mát.', 'tra-sen-vang-cu-nang', 'tra', { S: 45000, M: 55000, L: 65000 }, true),
  drink('Trà sen vàng (củ sen)', 'Trà sen thơm nhẹ cùng củ sen bùi ngọt.', 'tra-sen-vang-cu-sen', 'tra', { S: 45000, M: 55000, L: 65000 }, true),
  drink('Trà thạch đào', 'Trà thanh mát, đào miếng và thạch giòn.', 'tra-thach-dao', 'tra', { S: 45000, M: 55000, L: 65000 }, true),
  drink('Trà thạch vải', 'Trà hoa nhài, vải thiều và thạch giòn.', 'tra-thach-vai', 'tra', { S: 45000, M: 55000, L: 65000 }, true),
  drink('Trà thanh đào', 'Trà đào thanh nhẹ, hậu vị ngọt dịu.', 'tra-thanh-dao', 'tra', { S: 45000, M: 55000, L: 65000 }, true),
  drink('Trà đậu đỏ', 'Trà thơm cùng đậu đỏ ngọt bùi.', 'tra-dau-do', 'tra', { S: 45000, M: 55000, L: 65000 }, true),
  // Matcha
  drink('Matcha latte', 'Bột matcha Nhật pha sữa tươi béo nhẹ.', 'matcha-latte', 'matcha', { S: 59000, M: 65000, L: 69000 }, true),
  drink('Matcha dừa mây', 'Matcha phủ lớp kem dừa mây béo thơm.', 'matcha-dua-may', 'matcha', { M: 69000, L: 75000 }, true),
  // Đá xay
  drink('Trà xanh đá xay', 'Trà xanh xay lạnh, kem tươi phủ trên.', 'tra-xanh-da-xay', 'da-xay', { S: 55000, M: 65000, L: 69000 }, true),
  drink('Socola đá xay', 'Socola đậm vị xay lạnh cùng kem tươi.', 'socola-da-xay', 'da-xay', { S: 55000, M: 65000, L: 69000 }, true),
  drink('Cookies & Cream', 'Bánh quy nghiền, sữa béo và kem tươi.', 'cookies-cream', 'da-xay', { S: 55000, M: 65000, L: 69000 }, true),
  // Thức uống khác
  single('Chanh dây', 'Chanh dây chua ngọt, thanh mát.', 'chanh-day', 'khac', 49000),
  single('Chanh đá', 'Chanh tươi vắt cùng đá lạnh sảng khoái.', 'chanh-da', 'khac', 49000),
  // Bánh
  single('Bánh phô mai trà xanh', 'Phô mai béo mịn hoà vị trà xanh.', 'banh-pho-mai-tra-xanh', 'banh', 35000),
  single('Bánh phô mai caramel', 'Phô mai mềm mịn phủ caramel ngọt.', 'banh-pho-mai-caramel', 'banh', 35000),
  single('Bánh phô mai chanh dây', 'Phô mai béo cùng sốt chanh dây chua nhẹ.', 'banh-pho-mai-chanh-day', 'banh', 35000),
  single('Bánh sữa chua phô mai', 'Sữa chua phô mai mát lạnh, vị chua thanh.', 'banh-sua-chua-pho-mai', 'banh', 39000),
  single('Bánh tiramisu', 'Tiramisu cacao đậm vị cà phê.', 'banh-tiramisu', 'banh', 39000),
  single('Bánh croissant', 'Croissant bơ nướng giòn thơm.', 'banh-croissant', 'banh', 29000),
  single('Bánh su kem', 'Vỏ su giòn, nhân kem mềm mịn.', 'banh-su-kem', 'banh', 29000),
  single('Bánh chuối', 'Bánh chuối nướng thơm ngọt.', 'banh-chuoi', 'banh', 29000),
];
