# Product Backlog – Sprint 1 & Sprint 2

Backlog này được đưa lên **GitHub Projects** (bảng Kanban: `Backlog → Ready → In progress → In review → Done`).
Mỗi dòng dưới đây là một GitHub Issue (dùng mẫu `user-story`), gắn nhãn `sprint-1` / `sprint-2`.
Ước lượng theo cỡ áo thun: S ≈ ≤ 2 giờ, M ≈ nửa ngày, L ≈ 1 ngày+.

## Sprint 1 – Nền tảng kỹ thuật, tài liệu, MVP xem menu (Task 4)

**Sprint Goal:** có repository chuẩn, tài liệu dưới kiểm soát phiên bản, CI chặn merge lỗi và MVP xem menu chạy được.

| # | Issue | Yêu cầu | Cỡ | Tiêu chí chấp nhận (tóm tắt) | Trạng thái |
|---|---|---|---|---|---|
| S1-01 | Khởi tạo monorepo `apps/web`, `apps/api`, `docs` | — | S | `npm ci` + `npm run build` chạy được từ thư mục gốc | Done |
| S1-02 | README, `.gitignore`, `.env.example` | NFR-06 | S | Người mới chạy được local theo README | Done |
| S1-03 | Quy ước nhánh/PR/commit, DoD, PR template | — | S | `CONTRIBUTING.md`, `.github/pull_request_template.md` | Done |
| S1-04 | Đưa tài liệu Task 1–3 vào `docs/` | — | M | SRS, use-case, 6 sơ đồ (.puml + .svg/.png), ADR 001–007, deployment | Done |
| S1-05 | `GET /products` + dữ liệu mẫu (seed) | FR-01 | M | Trả danh sách 27 sản phẩm, không gồm sản phẩm đã lưu trữ | Done |
| S1-06 | `GET /products/:id` | FR-02 | S | Trả chi tiết; 404 khi không tồn tại | Done |
| S1-07 | Màn hình menu mobile-first (Next.js) | FR-01, NFR-04 | M | Nhóm theo loại, tìm kiếm, hiển thị tên/giá/ảnh | Done |
| S1-08 | Trạng thái loading / empty / error của menu | FR-01 | S | Skeleton khi tải; thông báo rỗng; lỗi + nút thử lại | Done |
| S1-09 | Test tối thiểu API + component | — | M | Unit test `ProductsService`, `ProductList`; e2e menu | Done |
| S1-10 | CI: Install → Lint → Unit Test → Build | NFR-08 | M | PR lỗi lint/test/build báo đỏ | Done |
| S1-11 | Bảo vệ nhánh `main` (required checks) | NFR-08 | S | PR đỏ không có nút merge | Done |
| S1-12 | Minh chứng CI: 1 PR xanh + 1 PR đỏ | NFR-08 | S | Link PR + ảnh/log | Done |

## Sprint 2 – Hoàn thiện luồng end-to-end, CI/CD, production (Task 5)

**Sprint Goal:** khách đặt – thanh toán – theo dõi đơn trọn vẹn, đóng gói tự động và có URL production truy cập được.

| # | Issue | Yêu cầu | Cỡ | Tiêu chí chấp nhận (tóm tắt) | Trạng thái |
|---|---|---|---|---|---|
| S2-01 | Chi tiết sản phẩm, size, topping | FR-02, FR-03 | M | Giá đổi đúng theo bảng giá size | Done |
| S2-02 | Giỏ hàng và tính tổng tiền | FR-04–06 | M | Sửa/xoá dòng, tổng cập nhật ngay | Done |
| S2-03 | Đăng ký, đăng nhập, JWT | FR-07–09, NFR-02, NFR-05 | M | Mật khẩu bcrypt; sai thông tin → 401 | Done |
| S2-04 | Tạo đơn hàng (server tính giá, giữ kho) | FR-10, FR-17 | L | `PENDING`, đúng tổng tiền, chống oversell | Done |
| S2-05 | Thanh toán Ví/Thẻ mô phỏng + idempotency | FR-11–13 | L | Cùng Idempotency-Key chỉ 1 giao dịch | Done |
| S2-06 | Xác nhận, trạng thái, lịch sử đơn | FR-14–16 | M | Theo dõi trạng thái, state machine | Done |
| S2-07 | Validate + xử lý lỗi frontend/backend | NFR-03 | M | Payload sai → 400 thông điệp rõ | Done |
| S2-08 | Migration thay `synchronize` + seed | — | M | Chạy migration tự động khi khởi động | Done |
| S2-09 | Dockerfile + Docker Compose web+api+db | NFR-06 | M | `docker compose up` chạy đủ hệ thống | To do |
| S2-10 | Kiểm thử E2E giao diện luồng chính | — | M | Mua hàng thành công + thanh toán lỗi | Done |
| S2-11 | CD: build image → GHCR → deploy Railway → smoke test | — | L | Merge `main` tự triển khai, smoke test `/health` | Done |
| S2-12 | Rollback + release notes + tag `v1.0.0` | — | S | Quy trình rollback được kiểm chứng | To do |
| S2-13 | Triển khai production (HTTPS) | NFR-07 | M | URL truy cập được lúc chấm | To do |
| S2-14 | `docs/traceability-matrix.md`, video demo, Sprint Review/Retro | — | M | Truy vết FR → UC → sơ đồ → code → test | To do |
| S2-15 | (Could) Khuyến mãi và điểm thưởng | FR-18 | L | Mã hợp lệ giảm đúng tiền | Backlog |

## Ghi chú
- Trạng thái "Done" phản ánh mã nguồn đã có sẵn trong repo tại thời điểm Sprint 1; khi đưa lên GitHub,
  tạo issue và đóng bằng PR tương ứng để lịch sử khớp.
- Mọi thay đổi phạm vi backlog ghi rõ lý do trong mô tả PR.
