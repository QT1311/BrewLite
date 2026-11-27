# Mô tả kiến trúc — BrewLite

> Task 3.1. Các quyết định quan trọng được ghi thành ADR trong [`adr/`](adr/). Sơ đồ triển khai: [`docs/diagrams/deployment-production.puml`](../diagrams/deployment-production.puml). Mô tả triển khai: [`docs/deployment.md`](../deployment.md).

## 1. Phương pháp

Kiến trúc được trình bày theo **C4 mức 2 (Container)**: mô tả các thành phần chạy độc lập (trình duyệt, Next.js, NestJS API, PostgreSQL, cổng thanh toán mô phỏng) và giao tiếp giữa chúng. Mức Component (module bên trong API) được mô tả ở mục 3. Mỗi thành phần đều truy vết được đến một yêu cầu trong SRS và một module trong mã nguồn.

## 2. Sơ đồ container

```
 Trình duyệt / PWA (điện thoại, máy tính)
        │  HTTPS
        ▼
 ┌──────────────────────┐   HTTPS + JSON, JWT trong header Authorization
 │ Web: Next.js 15      │ ───────────────────────────────────────────────┐
 │ (SSR + client, PWA)  │                                                 ▼
 └──────────────────────┘                                  ┌──────────────────────────┐
                                                           │ API: NestJS 11           │
                                                           │ (modular monolith)       │
                                                           │  • products  • auth      │
                                                           │  • orders    • payments  │
                                                           │  • health                │
                                                           └──────┬──────────┬────────┘
                                                                  │ TCP 5432 │ HTTPS (mô phỏng)
                                                                  ▼          ▼
                                                  ┌─────────────────────┐  ┌───────────────────┐
                                                  │ PostgreSQL 16       │  │ Payment gateway   │
                                                  │ volume bền vững     │  │ (mock nội bộ)     │
                                                  └─────────────────────┘  └───────────────────┘
```

| Container | Công nghệ | Trách nhiệm | Truy vết |
|---|---|---|---|
| Web (Next.js) | Next.js 15, React 19, TypeScript | Giao diện mobile-first, giỏ hàng lưu trong trình duyệt, gọi API, làm mới trạng thái đơn mỗi 5 giây | FR-01 → FR-15, NFR-04 |
| API (NestJS) | NestJS 11, TypeORM 0.3, class-validator | Nghiệp vụ: menu, xác thực, tạo đơn, thanh toán, trạng thái đơn, health | FR-01 → FR-17, NFR-02, NFR-03, NFR-05, NFR-07 |
| Cơ sở dữ liệu | PostgreSQL 16 | Lưu người dùng, sản phẩm, đơn, món trong đơn, giao dịch | NFR-02, FR-13, FR-17 |
| Cổng thanh toán | Mô-đun nội bộ `MockPaymentGateway` | Giả lập thành công/thất bại, trả mã giao dịch | FR-11, FR-12 |

## 3. Kiến trúc phân lớp trong API

API được chia theo module nghiệp vụ, mỗi module gồm controller (HTTP), service (nghiệp vụ), entity (dữ liệu) và DTO (đầu vào đã validate):

- **products:** đọc menu và chi tiết; đồng bộ menu mẫu khi khởi động.
- **auth:** đăng ký, đăng nhập, băm mật khẩu (bcrypt), cấp JWT; `JwtAuthGuard` bảo vệ các route ghi.
- **orders:** tạo đơn trong một transaction, trừ tồn kho, tính giá từ server, áp mã khuyến mãi, máy trạng thái đơn, huỷ đơn (hoàn kho và trả lượt dùng mã), cập nhật trạng thái bởi nhân viên (JWT + `RolesGuard`, ADR 010).
- **payments:** thanh toán với `Idempotency-Key`, khoá dòng đơn khi thanh toán, gọi cổng mock, cộng điểm thưởng khi thành công.
- **promotions:** mã khuyến mãi; giữ/trả lượt dùng bằng `UPDATE` có điều kiện (ADR 011).
- **loyalty:** sổ điểm thưởng (`loyalty_transactions`) và `GET /loyalty/me`.
- **admin:** doanh thu, xem mọi đơn, quản lý món, nhân viên và mã khuyến mãi (chỉ vai trò admin).
- **catalog:** bảng giá theo size và topping (`pricing.ts`), dùng chung cho đơn hàng để giá không phụ thuộc client.
- **health:** `GET /health` kiểm tra kết nối cơ sở dữ liệu.

Module chỉ giao tiếp qua service đã export; không module nào đọc thẳng entity của module khác ngoài các quan hệ đã khai báo.

## 4. Chất lượng và các quyết định liên quan

| Thuộc tính | Cách đáp ứng | ADR |
|---|---|---|
| Toàn vẹn tiền | Giá tính ở server; thanh toán có idempotency key và UNIQUE index | [006](adr/006-payment-idempotency.md) |
| Không bán vượt tồn kho | Transaction + optimistic locking (`version`) | [005](adr/005-stock-concurrency.md) |
| Bảo mật | Băm mật khẩu bcrypt, JWT, validate đầu vào, secret qua biến môi trường | [004](adr/004-jwt-token-storage.md) |
| Khả năng bảo trì | Monorepo, mô-đun theo nghiệp vụ | [001](adr/001-monorepo.md), [002](adr/002-modular-monolith.md) |
| Triển khai | Docker image, health check, CD trên nền tảng PaaS | [007](adr/007-railway-deployment.md) |

## 5. Cấu hình, log và health

- **Cấu hình:** mọi giá trị thay đổi theo môi trường đi qua biến môi trường (`.env` local, Railway variables trên production). Mẫu nằm trong `.env.example`; không có secret nào được commit.
- **Health check:** `GET /health` trả 200 khi API kết nối được PostgreSQL, và 503 khi không. Nền tảng dùng endpoint này để quyết định khởi động lại hoặc chuyển traffic.
- **Log:** hiện dùng logger mặc định của NestJS, ghi ra stdout. Nền tảng thu thập stdout nên không cần file log riêng. **Chưa có** log có cấu trúc (JSON) và correlation id; đây là hạn chế đã biết.
- **Migration:** môi trường phát triển đang dùng `synchronize: true` của TypeORM để tự tạo bảng. Trên production `synchronize` bị tắt; trước khi deploy, nhóm sẽ chuyển sang migration có version (Task 5.2) để tạo lại được database.

## 6. Ưu điểm, hạn chế và trade-off

**Ưu điểm.** Đơn giản để triển khai và kiểm thử (một API, một database); transaction cục bộ đủ cho bài toán tồn kho; ranh giới module rõ nên có thể tách dần nếu cần.

**Hạn chế.** Một điểm lỗi cho toàn bộ API; mở rộng theo chiều ngang phải nhân bản cả khối; cổng thanh toán chỉ là mock nên chưa có đường xử lý webhook hay đối soát thật. Các hạn chế này được chấp nhận vì phạm vi đồ án (xem ADR 002).

**Trade-off chính.**
- Lưu JWT trong `localStorage` tiện cho SPA nhưng dễ bị ảnh hưởng nếu có XSS; đổi lại là đơn giản và không cần cookie/CSRF (ADR 004).
- Optimistic locking thay vì khoá bi quan toàn cục giúp tránh nghẽn, nhưng yêu cầu thử lại khi xung đột (ADR 005).
- PaaS (Railway) tiết kiệm công vận hành, đổi lại phụ thuộc nền tảng và chi phí theo mức sử dụng (ADR 007).

## 7. Việc còn lại trước khi nộp

- Chuyển `synchronize` sang migration có version và seed dữ liệu tái tạo được (Task 5.2).
- Đóng gói `apps/web` và `apps/api` thành Docker image; thêm dịch vụ web và api vào `docker-compose.yml` (Task 5.2).
- Thêm log có cấu trúc nếu có thời gian (không bắt buộc theo đề).
