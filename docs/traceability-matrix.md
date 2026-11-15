# Ma trận truy vết — BrewLite v1.0.0

Truy vết hai chiều từ **yêu cầu** (SRS) → **use-case / user story** → **sơ đồ** → **code** → **kiểm thử**. Cuối tài liệu có bảng đối chiếu yêu cầu Task 5 với bằng chứng và danh sách khoảng trống còn lại.

**Nguồn:** [SRS](requirements/srs.md) · [Đặc tả UC-01](requirements/use-case-spec.md) · [Sơ đồ](diagrams/README.md) · [Backlog](process/backlog.md) · [ADR](architecture/adr/).

## Quy ước

- **UC/US:** UC-01 là use-case "Đặt và thanh toán đơn hàng"; UC-Overview là sơ đồ use-case tổng quát; `S1-xx` / `S2-xx` là user story trong backlog.
- **Sơ đồ:** Activity-01, Sequence-01, Class-01, `deployment-production.png` (sơ đồ triển khai), xem [`diagrams/README.md`](diagrams/README.md).
- **Code:** đường dẫn tính từ thư mục gốc repo; `api/` = `apps/api/src/`, `web/` = `apps/web/src/`.
- **Test:**
  - `INT-T01…T12`: integration test API trong `apps/api/src/__e2e__/orders-payments.e2e-spec.ts` (PostgreSQL thật).
  - `E2E-T01…T05`: Playwright trong `tests/e2e/checkout.spec.ts`, chạy trên cả `desktop` và `mobile` (Pixel 5):
    T01 thực đơn và đổi size · T02 chưa đăng nhập phải đăng nhập · T03 đăng ký → chọn món → đặt đơn → thanh toán · T04 thanh toán thất bại rồi thử lại · T05 lịch sử đơn.
  - Các tên còn lại là file unit test (Vitest/Jest) cạnh code hoặc trong `apps/web/tests/`.

## 1. Yêu cầu chức năng

| FR | Yêu cầu (rút gọn) | UC / US | Sơ đồ | Code | Kiểm thử |
|---|---|---|---|---|---|
| FR-01 | Hiển thị menu | UC-Overview; S1-05, S1-07, S1-08 | Activity-01 | `api/products/products.controller.ts`, `products.service.ts`, `seed-data.ts`; `web/components/ProductList.tsx`, `ProductCard.tsx`, `web/app/page.tsx` | `products.service.spec.ts`; `ProductList.test.tsx`; E2E-T01 |
| FR-02 | Xem chi tiết món | UC-Overview; S1-06, S2-01 | Activity-01 | `GET /products/:id` (`products.controller.ts`); `web/components/ProductDetail.tsx`, `web/app/products/[id]` | `products.service.spec.ts` (findOne); `ProductDetail.test.tsx` (không tìm thấy, lỗi server); E2E-T01 |
| FR-03 | Chọn size, topping; giá theo size | UC-Overview, UC-01 bước 1; S2-01 | Class-01 | `api/catalog/pricing.ts`; `web/lib/cart.ts` (`unitPrice`), `web/lib/options.ts` | `pricing.spec.ts`; `cart.test.ts`; `ProductDetail.test.tsx`; INT-T02; E2E-T01 |
| FR-04 | Thêm vào giỏ | UC-01 bước 1; S2-02 | Activity-01 | `web/lib/cart.ts`, `CartContext.tsx`; `web/components/CartLink.tsx`, `CartView.tsx` | `cart.test.ts`; `ProductDetail.test.tsx` (badge tăng); E2E-T03 |
| FR-05 | Sửa số lượng, xoá dòng | UC-01 bước 1; S2-02 | Activity-01 | `web/lib/cart.ts`; `web/components/CartView.tsx` | `cart.test.ts` (sửa, về 0 thì xoá, giới hạn, xoá dòng) |
| FR-06 | Tự tính tổng giỏ | UC-01; S2-02 | Activity-01 | `web/lib/cart.ts` | `cart.test.ts` (tổng = Σ đơn giá × số lượng) |
| FR-07 | Đăng ký tài khoản | UC-01 luồng A1; S2-03 | Sequence-01 | `api/auth/auth.service.ts`, `auth.controller.ts`, `dto/auth.dto.ts`; `web/components/AuthForm.tsx`, `web/app/register` | `auth.service.spec.ts` (băm mật khẩu, email trùng 409); `auth.test.tsx` (validate, mật khẩu ≥ 8 ký tự); E2E-T03 |
| FR-08 | Đăng nhập, nhận JWT | UC-01 luồng A1; S2-03 | Sequence-01 | `api/auth/auth.service.ts`; `web/lib/AuthContext.tsx`, `web/app/login` | `auth.service.spec.ts` (đúng → JWT, sai → 401); `auth.test.tsx`; E2E-T02, T03 |
| FR-09 | Phải đăng nhập mới tạo đơn | UC-01 E4; S2-03 | UC-01, Sequence-01 | `api/auth/jwt-auth.guard.ts`; `web/lib/useRequireAuth.ts` | `jwt-auth.guard.spec.ts`; INT-T01; E2E-T02 |
| FR-10 | Tạo đơn từ giỏ | UC-01 bước 2–4; S2-04 | Sequence-01, Activity-01 | `api/orders/orders.service.ts` (`create`), `orders.controller.ts`, `dto/create-order.dto.ts`; `web/components/CartView.tsx` | INT-T02, INT-T03; `checkout.test.tsx` (giỏ → POST /orders, không gửi giá); E2E-T03 |
| FR-11 | Thanh toán không tiền mặt (mock) | UC-01 bước 5–9; S2-05 | Sequence-01 | `api/payments/payments.service.ts`, `mock-payment.gateway.ts`, `payments.controller.ts`; `web/components/Checkout.tsx` | INT-T06, INT-T08; `checkout.test.tsx` (thành công); E2E-T03 |
| FR-12 | Thanh toán thất bại, giữ giỏ, thử lại | UC-01 A3, E5; S2-05 | Activity-01, Sequence-01 | `api/payments/payments.service.ts`; `web/components/Checkout.tsx` | INT-T08; `checkout.test.tsx` (thất bại giữ giỏ, thử lại key mới); E2E-T04 |
| FR-13 | Idempotency thanh toán | UC-01 A4, E6, E7; S2-05; ADR 006 | Sequence-01 | `api/payments/payments.service.ts`, `dto/create-payment.dto.ts` | INT-T06, INT-T09; `checkout.test.tsx` (lỗi mạng dùng cùng key) |
| FR-14 | Xác nhận đơn | UC-01 bước 10; S2-06 | Activity-01 | `web/components/OrderDetail.tsx`, `StatusBadge.tsx`, `web/app/orders/[id]`, `web/app/checkout/[id]` | `checkout.test.tsx` (thanh toán xong chuyển trang xác nhận, giỏ trống); E2E-T03 |
| FR-15 | Lịch sử đơn của mình | UC-01 E9; S2-06 | Sequence-01 | `GET /orders/me` (`orders.controller.ts`); `web/components/OrderHistory.tsx`, `web/app/orders` | INT-T10 (không lộ đơn người khác); E2E-T05 |
| FR-16 | State machine trạng thái đơn | UC-01 bước 9, 11, E8; S2-06 | Class-01 (enum trạng thái) | `api/orders/order-status.ts`; `PATCH /orders/:id/status` (`orders.controller.ts`, `common/staff-key.guard.ts`) | `order-status.spec.ts`; INT-T07, INT-T11, INT-T12 |
| FR-17 | Tồn kho đồng thời | UC-01 E1, E2; S2-04; ADR 005 | Sequence-01, Activity-01 | `api/orders/orders.service.ts` (transaction + optimistic locking) | INT-T04, INT-T05 |
| FR-18 | Khuyến mãi, điểm thưởng (Could) | UC-01 mục 7 (ngoài phạm vi) | Class-01 (Promotion, LoyaltyTransaction) | **Chưa triển khai** | Không có (xem mục 4) |

## 2. Yêu cầu phi chức năng

| NFR | Yêu cầu (rút gọn) | Cách đáp ứng | Code / cấu hình | Kiểm thử / bằng chứng |
|---|---|---|---|---|
| NFR-01 | API phản hồi dưới 500 ms | Truy vấn đơn giản, dữ liệu mẫu nhỏ | `api/products/`, `api/orders/` | **Chưa có test hiệu năng tự động** (xem mục 4) |
| NFR-02 | Băm mật khẩu | `bcryptjs` khi đăng ký | `api/auth/auth.service.ts` | `auth.service.spec.ts` (băm mật khẩu) |
| NFR-03 | Validate dữ liệu vào | `ValidationPipe` (whitelist, transform) + DTO | `api/main.ts`, `*/dto/*.dto.ts` | INT-T03, INT-T09; `auth.test.tsx` (validate phía client) |
| NFR-04 | Mobile-first | Giao diện responsive | `web/app/globals.css` | Bộ E2E-T01…T05 chạy cả project `mobile` (Pixel 5) |
| NFR-05 | Route đơn/thanh toán dùng JWT guard | `JwtAuthGuard` | `api/auth/jwt-auth.guard.ts` | `jwt-auth.guard.spec.ts`; INT-T01 |
| NFR-06 | Chạy toàn bộ bằng một lệnh | Docker Compose web + api + db | `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile` | Job `e2e` trong CI dùng `docker compose up --wait`; README mục "Chạy toàn bộ bằng Docker" |
| NFR-07 | Health check | `GET /health` (kiểm tra DB, trả `version`) | `api/health/health.controller.ts`; `HEALTHCHECK` trong Dockerfile | `scripts/smoke-test.sh` trong CD; ADR 009 |
| NFR-08 | CI chặn merge khi lỗi | Ruleset `main`, required checks | `.github/workflows/ci.yml` | [`process/ci-evidence.md`](process/ci-evidence.md): PR #1 xanh, PR #2 đỏ không merge được |

## 3. Yêu cầu Task 5 → bằng chứng

| Yêu cầu của đề | Bằng chứng trong repo / hệ thống |
|---|---|
| Triển khai production, URL hoạt động | Web: https://web-production-97f35c81.up.railway.app · API: https://api-production-9d99f943.up.railway.app/health · [`deployment.md`](deployment.md), ADR 007, `diagrams/deployment-production.png` |
| Database không public | Postgres trên Railway chỉ dùng mạng nội bộ (`postgres.railway.internal`), không bật TCP proxy; API đọc `DATABASE_URL` |
| Migration an toàn | `api/database/*`, ADR 008, `migrationsRun` khi khởi động; `down` cho mỗi migration; ADR 009 (expand-only) |
| Dockerfile / Compose | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml` |
| Kiểm thử E2E | `tests/e2e/checkout.spec.ts`, [`tests/README.md`](../tests/README.md), job `e2e` trong CI |
| Pipeline CI | `.github/workflows/ci.yml` (Lint → Test → Build → E2E) |
| Pipeline CD (Push/Tag → Lint+Test → Build → Registry → Deploy → Smoke test) | `.github/workflows/cd.yml`; image `ghcr.io/qt1311/brewlite-api`, `brewlite-web` gắn tag commit SHA và `v1.0.0`; `scripts/smoke-test.sh` |
| Dừng pipeline và rollback khi lỗi | Rollback tự động trong `cd.yml`; rollback thủ công `.github/workflows/rollback.yml` (đã chạy thử về commit `85236413…`, `/health` trả đúng `version`) |
| Release, tag, release notes | Tag `v1.0.0`, GitHub Release, [`release-notes/v1.0.0.md`](release-notes/v1.0.0.md) |
| README: chạy, test, build, deploy, rollback | `README.md` các mục "Chạy trên máy", "Kiểm thử", "Chạy toàn bộ bằng Docker", "Deploy, rollback và phát hành" |
| Không lộ secret | `.env` không commit; `RAILWAY_TOKEN` ở GitHub Secrets; `JWT_SECRET`, `STAFF_API_KEY`, `DATABASE_URL` ở Railway Variables (`deployment.md` mục 5, ADR 009) |

## 4. Khoảng trống đã biết (cập nhật theo thực tế)

| Mục | Tình trạng | Hướng xử lý |
|---|---|---|
| FR-18 (khuyến mãi, điểm thưởng) | Chưa làm; mức Could | Ghi trong release notes mục "Hạn chế đã biết" |
| NFR-01 (hiệu năng) | Chưa có test tự động | Có thể thêm phép đo đơn giản (ví dụ autocannon) cho `GET /products` và `POST /orders` |
| Giao diện nhân viên quầy | Chỉ có API `PATCH /orders/:id/status` (`x-staff-key`) | Tuỳ chọn làm trang `/staff` |
| Thanh toán thật | Chỉ có cổng mock | Ngoài phạm vi (UC-01 mục 7) |
