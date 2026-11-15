# Sơ đồ BrewLite

Mỗi sơ đồ có tệp nguồn PlantUML (`.puml`) và ảnh kết xuất (`.svg`, `.png`). Để kết xuất lại:
`java -jar plantuml.jar -tsvg <file>.puml` (hoặc `-tpng`).

| Mã | Sơ đồ | Tệp | Nội dung chính | Yêu cầu / use-case liên quan |
|---|---|---|---|---|
| UC-Overview | Use-case tổng quát | `usecase-overview.puml` | 9 use-case của khách hàng, actor Payment Gateway | FR-01 → FR-15 |
| UC-01 | Use-case "Đặt và thanh toán đơn hàng" | `usecase-uc01-place-and-pay.puml` | include/extend: đăng nhập, giỏ hàng, tạo đơn, thanh toán, thử lại, huỷ | FR-09 → FR-14, [use-case-spec.md](../requirements/use-case-spec.md) |
| Activity-01 | Activity diagram (swimlane) | `activity-checkout.puml` | Luồng end-to-end từ xem menu đến xác nhận đơn; nhánh chưa đăng nhập, hết hàng, thanh toán thất bại, thử lại / huỷ | FR-01 → FR-17 |
| Sequence-01 | Sequence diagram | `sequence-checkout.puml` | Customer → Next.js UI → NestJS API → PostgreSQL → Payment Service: JWT, validate, transaction + tồn kho, alt thành công/thất bại, idempotency, theo dõi đơn | UC-01, FR-10 → FR-14, FR-17, NFR-03, NFR-05 |
| Class-01 | Class diagram (domain) | `class-domain.puml` | User, Product, Order, OrderItem, Payment, Promotion, LoyaltyTransaction + enum trạng thái | FR-03, FR-10 → FR-18 |

## Đối chiếu với mô hình dữ liệu

- Các lớp `User`, `Product`, `Order`, `OrderItem`, `Payment` khớp với entity trong `apps/api/src` (bảng `users`, `products`, `orders`, `order_items`, `payments`).
- `Promotion` và `LoyaltyTransaction` thuộc FR-18 (mức **Could**), hiện **chưa hiện thực**; được vẽ trong sơ đồ domain theo yêu cầu đề bài và đánh dấu `«FR-18 · chưa hiện thực»`.
- Máy trạng thái trong note của Class-01 giống `apps/api/src/orders/order-status.ts` (FR-16).
- Mã lỗi HTTP trong Sequence-01 (401/400/409/404/422) khớp với các test INT-T01 → T12.
