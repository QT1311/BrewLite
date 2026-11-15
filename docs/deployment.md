# Triển khai — BrewLite

> Mô tả triển khai theo ADR 007 (Railway). Sơ đồ: [`diagrams/deployment-production.png`](diagrams/deployment-production.png).

## 1. Môi trường

| Môi trường | Cách chạy | Database | Ghi chú |
|---|---|---|---|
| Local | `docker compose up -d db`, rồi `npm run dev:api` và `npm run dev:web` | Container PostgreSQL 16, volume `brewlite_pgdata` | Migration tự chạy khi API khởi động (`synchronize` tắt, ADR 008) |
| CI | GitHub Actions: lint → test (service Postgres 16) → build → build image | Container PostgreSQL 16 (`brewlite_test`) | Không deploy từ nhánh không phải `main` |
| Production | Railway: ba service `web`, `api`, `postgres` trong một project | Volume bền vững, không có domain công khai | Migration tự chạy khi `api` khởi động; kết nối qua `DATABASE_URL` |

## 2. Dịch vụ trên Railway

| Service | Nguồn | Port | Biến môi trường chính | Health check |
|---|---|---|---|---|
| `web` | Image `brewlite-web:<sha>` từ GHCR | `PORT` (Railway cấp) | `NEXT_PUBLIC_API_URL` | `GET /` |
| `api` | Image `brewlite-api:<sha>` từ GHCR | `API_PORT` | `JWT_SECRET`, `JWT_EXPIRES_IN`, `STAFF_API_KEY`, `WEB_ORIGIN`, `POSTGRES_*` | `GET /health` |
| `postgres` | Dịch vụ PostgreSQL của Railway | 5432 (nội bộ) | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `pg_isready` (nền tảng) |

**Lưu ý:** `NEXT_PUBLIC_API_URL` được nhúng vào bundle lúc build, nên đổi URL API phải build lại image web.

## 3. Quy trình phát hành

1. Push hoặc merge vào `main`; CI chạy lint, test và build.
2. Nếu pass, CI build image cho `web` và `api` với tag là commit SHA, đẩy lên GHCR.
3. Migration chạy một lần trước khi `api` nhận traffic mới.
4. Trigger deploy trên Railway; Railway pull image và chạy health check.
5. Smoke test: `GET /health` trả 200 và `GET /products` trả danh sách món.
6. Gắn tag phiên bản `vX.Y.Z` và viết release notes.

## 4. Rollback

- **Cách 1 (nhanh):** trên Railway, chọn deployment trước đó của service và "Rollback". Image cũ vẫn còn trong giới hạn lưu trữ của gói.
- **Cách 2:** deploy lại image của tag trước (tag `vX.Y.Z-1` hoặc SHA cũ) bằng cách đổi image source.
- **Migration:** mỗi migration phải có bước `down`. Nếu migration mới làm hỏng dữ liệu, chạy `down` trước khi rollback code.

Sau khi rollback, kiểm tra lại `GET /health` và luồng đặt đơn cơ bản.

## 5. Secret

- Không có secret trong repository hay log CI. Giá trị thật chỉ nằm trong Railway Variables và GitHub Secrets.
- `.env.example` chỉ chứa giá trị mẫu.
- Khoá `STAFF_API_KEY` và `JWT_SECRET` phải được đổi khỏi giá trị mặc định trước khi chạy production.

## 6. Việc cần xác minh khi triển khai

- HTTPS và domain mặc định của Railway cho `web` và `api`.
- Giới hạn lưu image rollback theo gói Hobby.
- Chi phí thực tế sau một tuần chạy, so với ước tính trong ADR 007.
