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
| `api` | Image `brewlite-api:<sha>` từ GHCR | `API_PORT` | `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `WEB_ORIGIN`, `POSTGRES_*` | `GET /health` |
| `postgres` | Dịch vụ PostgreSQL của Railway | 5432 (nội bộ) | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `pg_isready` (nền tảng) |

**Lưu ý:** `NEXT_PUBLIC_API_URL` được nhúng vào bundle lúc build, nên đổi URL API phải build lại image web.

## 3. Quy trình phát hành (ADR 009)

1. Merge PR vào `main` (hoặc đẩy tag `vX.Y.Z`) → workflow **CD** chạy.
2. Job `quality` gọi lại CI: lint, test, build, E2E. Lỗi thì dừng.
3. Job `build-push` build image `brewlite-api`, `brewlite-web` và đẩy lên GHCR với tag là commit SHA.
4. Job `deploy` ghi lại digest `production` hiện tại, trỏ `production` (và `vX.Y.Z` nếu có) vào SHA mới, gọi `railway redeploy`.
5. Migration chạy khi `api` khởi động, trước khi Railway chuyển traffic (health check `/health` phải xanh).
6. Smoke test: `/health` có `version` đúng SHA, `/products` không rỗng, web trả 200.
7. Smoke test lỗi → pipeline tự rollback về digest trước đó rồi báo thất bại.

Phát hành chính thức: `git tag v1.0.0 && git push origin v1.0.0`, sau đó tạo GitHub Release với nội dung `docs/release-notes/`.

## 4. Rollback

- **Tự động:** xảy ra trong job `deploy` khi smoke test lỗi.
- **Thủ công (khuyến nghị):** Actions → **Rollback** → Run workflow → nhập SHA đầy đủ hoặc tag (ví dụ `v1.0.0`). Workflow trỏ `production` về image đó, redeploy và smoke test.
- **Khẩn cấp:** trên Railway, mở service → Deployments → chọn bản trước → Rollback (chỉ còn trong thời gian lưu của gói).
- **Migration:** migration mới chỉ theo kiểu tương thích ngược; nếu cần hoàn tác dữ liệu, chạy `npm run migration:revert` (trong `apps/api`, với `DATABASE_URL` production) trước khi rollback code.

Sau rollback, kiểm tra `GET /health` (trường `version`) và luồng đặt đơn cơ bản.

## 5. Secret

- Không có secret trong repository hay log CI. Giá trị thật chỉ nằm trong Railway Variables và GitHub Secrets.
- `.env.example` chỉ chứa giá trị mẫu.
- `JWT_SECRET` phải là chuỗi ngẫu nhiên dài; `ADMIN_PASSWORD` phải là mật khẩu mạnh. Biến `STAFF_API_KEY` cũ không còn được dùng (ADR 010) và có thể xoá.

## 6. Việc cần xác minh khi triển khai

- HTTPS và domain mặc định của Railway cho `web` và `api`.
- Giới hạn lưu image rollback theo gói Hobby.
- Chi phí thực tế sau một tuần chạy, so với ước tính trong ADR 007.

## 7. Thiết lập lần đầu (một lần)

**Railway**
1. Tạo project; thêm **PostgreSQL** (không bật TCP proxy công khai).
2. Thêm service `api` từ image `ghcr.io/<owner>/brewlite-api:production`; Variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET` (chuỗi ngẫu nhiên dài), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `WEB_ORIGIN=<URL web>`, `DB_SSL=false`. Health check path `/health`. Tạo domain công khai.
3. Thêm service `web` từ image `ghcr.io/<owner>/brewlite-web:production`; tạo domain công khai.
4. Tạo **Project Token** (Settings → Tokens).

**GitHub** (Settings → Secrets and variables → Actions)
- Secret `RAILWAY_TOKEN` = project token.
- Variables `PROD_API_URL`, `PROD_WEB_URL` (dạng `https://...up.railway.app`, không có dấu `/` cuối).
- Sau lần build đầu, vào Packages → `brewlite-api`/`brewlite-web` → Package settings → đặt **Public**.
