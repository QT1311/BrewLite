# BrewLite

Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt (đồ án môn Công nghệ phần mềm).
Công nghệ: **Next.js** (web, mobile-first) · **NestJS** (API) · **PostgreSQL** · **Docker**.

## Trạng thái hiện tại — Bước 6

- [x] Cấu trúc monorepo (`apps/api`, `apps/web`, `docs`)
- [x] API `GET /products`, `GET /products/:id`, `GET /health` (NestJS + TypeORM + PostgreSQL, tự nạp dữ liệu mẫu)
- [x] Unit test cho `ProductsService`
- [x] Tài liệu Task 1.1–1.2: `docs/requirements/` và use-case tổng quát `docs/diagrams/`
- [x] Giao diện menu Next.js (Bước 2): glass UI, trạng thái loading / rỗng / lỗi + nút thử lại, 6 unit test component
- [x] Chi tiết sản phẩm (chọn size/topping, đơn giá cập nhật) và giỏ hàng (thêm/sửa/xoá, tự tính tổng, lưu localStorage) — Bước 3
- [x] Đăng ký / đăng nhập JWT (bcrypt, JwtAuthGuard, `GET /auth/me`) + trang `/login`, `/register` — Bước 4
- [x] Đặt đơn (server tự tính giá, giữ tồn kho bằng transaction + optimistic locking), thanh toán mock có Idempotency-Key, máy trạng thái đơn, trang thanh toán / xác nhận / theo dõi / lịch sử đơn — Bước 5
- [x] Git + GitHub, ESLint, CI GitHub Actions (Lint & typecheck → Test → Build) — Bước 6
- [x] Migration TypeORM thay `synchronize` (Task 5.2) — xem `docs/architecture/adr/008-migrations.md`
- [x] Dockerfile (api, web) và Docker Compose đủ web + api + db (Task 5.3)
- [x] Kiểm thử E2E giao diện bằng Playwright, chạy trong CI trên hệ thống Docker Compose (Task 5.2)
- [x] CD (GitHub Actions → GHCR → Railway), smoke test, rollback (Task 5.3, ADR 009)
- [x] Production chạy trên Railway: https://web-production-97f35c81.up.railway.app

## Quy trình làm việc

Xem [`CONTRIBUTING.md`](CONTRIBUTING.md) (nhánh, PR, commit, Definition of Done) và
[`docs/process/backlog.md`](docs/process/backlog.md) (Product Backlog Sprint 1 & 2).
Minh chứng CI: [`docs/process/ci-evidence.md`](docs/process/ci-evidence.md).

## Yêu cầu môi trường

- Node.js 20 trở lên (khuyến nghị 22) và npm 10 trở lên
- Docker Desktop (để chạy PostgreSQL), hoặc tự cài PostgreSQL 16

## Chạy trên máy (local)

```bash
# 1. Tạo file cấu hình
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env

# 2. Bật PostgreSQL
docker compose up -d db

# 3. Cài thư viện (chạy ở thư mục gốc)
npm install

# 4. Chạy API  (http://localhost:3001)
npm run dev:api

# 5. Chạy web (mở terminal thứ hai) → http://localhost:3000
npm run dev:web
```

Kiểm tra nhanh:

```bash
curl http://localhost:3001/health        # {"status":"ok","database":"up",...}
curl http://localhost:3001/products      # danh sách 27 sản phẩm
curl http://localhost:3001/products/1    # chi tiết một sản phẩm
# Đăng ký → nhận accessToken, dùng cho các route cần đăng nhập:
# curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d '{"email":"a@b.com","name":"An","password":"matkhau123"}'
```

## API chính

| Method | Endpoint | Mô tả | Xác thực |
|---|---|---|---|
| GET | `/health` | Kiểm tra API + CSDL | — |
| GET | `/products`, `/products/:id` | Menu, chi tiết sản phẩm | — |
| POST | `/auth/register`, `/auth/login` | Đăng ký / đăng nhập, trả `accessToken` | — |
| GET | `/auth/me` | Thông tin người dùng hiện tại | JWT |
| POST | `/orders` | Tạo đơn `PENDING` từ giỏ hàng | JWT |
| GET | `/orders/me`, `/orders/:id` | Lịch sử đơn, chi tiết đơn của chính mình | JWT |
| POST | `/orders/:id/cancel` | Huỷ đơn chưa thanh toán (hoàn kho) | JWT |
| POST | `/payments` | Thanh toán mock, bắt buộc header `Idempotency-Key` | JWT |
| PATCH | `/orders/:id/status` | Nhân viên cập nhật `PREPARING` → `READY` → `COMPLETED` | `x-staff-key` |

Máy trạng thái đơn: `PENDING → PAID → PREPARING → READY → COMPLETED`; `PENDING → PAYMENT_FAILED → PAID` (thanh toán lại); `PENDING / PAYMENT_FAILED → CANCELLED`. Chuyển sai trả lỗi 409.

Demo nhân viên quầy cập nhật đơn (ở môi trường dev, staff key mặc định là `dev-staff-key`):

```powershell
curl.exe -X PATCH http://localhost:3001/orders/1/status -H "Content-Type: application/json" -H "x-staff-key: dev-staff-key" -d "{\"status\":\"PREPARING\"}"
```

## Chạy toàn bộ bằng Docker (một lệnh)

Yêu cầu: Docker Desktop đang chạy và file `.env` có `JWT_SECRET`, `STAFF_API_KEY` (sao chép từ `.env.example`).

```bash
docker compose up -d --build     # dựng db + api + web (lần đầu mất vài phút)
docker compose ps                # các dịch vụ phải ở trạng thái healthy
# Web: http://localhost:3000   API: http://localhost:3001/health
docker compose logs -f api       # xem log API
docker compose down              # dừng (giữ dữ liệu); thêm -v để xoá cả dữ liệu
```

API tự chạy migration và nạp dữ liệu mẫu khi khởi động. `NEXT_PUBLIC_API_URL` được nhúng vào bản build của web
(đổi giá trị trong `.env` rồi chạy lại `docker compose up -d --build`).

## Migration cơ sở dữ liệu

Schema do migration quản lý (thư mục `apps/api/src/database/migrations`). API tự chạy migration khi khởi động.

```bash
npm run migration:show     --workspace apps/api   # xem migration đã/chưa chạy
npm run migration:run      --workspace apps/api   # chạy thủ công
npm run migration:revert   --workspace apps/api   # hoàn tác migration gần nhất
npm run migration:generate --workspace apps/api -- src/database/migrations/TenThayDoi   # sinh từ thay đổi entity
```

Sinh migration mới xong cần thêm class vào `apps/api/src/database/migrations/index.ts`.

## Kiểm thử E2E giao diện (Playwright)

Kiểm thử luồng người dùng thật trên trình duyệt: xem menu, đổi size, đăng ký, đặt đơn, thanh toán thành công,
thanh toán thất bại rồi thử lại, xem lịch sử đơn. Mỗi kịch bản chạy trên cả màn hình máy tính và điện thoại.

```bash
docker compose up -d --build --wait   # dựng web + api + db
npx playwright install chromium       # chỉ cần lần đầu
npm run test:ui                       # chạy E2E (E2E_BASE_URL mặc định http://localhost:3000)
```

Nếu máy không tải được Chromium của Playwright (lỗi `ENOTFOUND cdn.playwright.dev`), dùng Google Chrome đã cài sẵn:

```powershell
$env:E2E_BROWSER_CHANNEL = "chrome"
npm.cmd run test:ui
```

Mã nguồn nằm ở `tests/e2e/`. CI chạy cùng bộ kiểm thử này ở job `E2E (Docker Compose + Playwright)` và lưu báo cáo khi thất bại.

## Kiểm tra chất lượng (giống CI)

```bash
npm run lint        # ESLint toàn bộ monorepo
npm run typecheck   # kiểm tra kiểu TypeScript cho api + web
npm test            # unit test
npm run test:e2e    # integration test (cần PostgreSQL)
npm run build       # build api + web
```

## Quy trình Git & CI

- Nhánh `main` luôn ở trạng thái chạy được; mỗi chức năng làm trên nhánh riêng `feature/<tên>` rồi mở Pull Request vào `main`.
- Commit theo dạng `<loại>: <mô tả>` (Conventional Commits), ví dụ `feat(api): thêm POST /orders`, `docs: thêm ADR-001`, `fix(web): ...`, `test: ...`, `ci: ...`.
- GitHub Actions (`.github/workflows/ci.yml`) chạy **Lint & typecheck → Test (unit + integration trên PostgreSQL) → Build → E2E** cho mỗi Pull Request vào `main`; khi push `main` hoặc tag, `cd.yml` gọi lại CI rồi deploy.
- Nhánh `main` được bảo vệ: PR chỉ merge được khi các job CI xanh (NFR-08).

## Deploy, rollback và phát hành

Production chạy trên Railway (web, api, PostgreSQL không public). Chi tiết: [`docs/deployment.md`](docs/deployment.md), [ADR 009](docs/architecture/adr/009-cd-rollback.md).

**Deploy:** merge PR vào `main` hoặc đẩy tag. Workflow **CD** chạy Lint + Test → build image → đẩy GHCR (tag là commit SHA) → deploy Railway → smoke test (`scripts/smoke-test.sh`). Smoke test lỗi thì tự rollback về bản trước.

**Rollback thủ công:** GitHub → Actions → **Rollback** → Run workflow → nhập commit SHA đầy đủ hoặc tag (ví dụ `v1.0.0`).

**Phát hành bản mới:**

```bash
git tag v1.0.0
git push origin v1.0.0     # CD build image gắn tag v1.0.0 và deploy
```

Sau đó tạo GitHub Release từ tag, dùng nội dung trong `docs/release-notes/`.

**Kiểm tra sau deploy:** `GET <API>/health` trả `status: ok`, `database: up` và `version` là commit đang chạy.

**Secret:** không có trong repo. `RAILWAY_TOKEN` ở GitHub Secrets; `JWT_SECRET`, `STAFF_API_KEY`, `DATABASE_URL` ở Railway Variables.

## Kiểm thử

```bash
npm test                                  # unit test API + test component web
npm run test:e2e --workspace apps/api     # integration test đặt đơn/thanh toán (cần PostgreSQL đang chạy)
```

Integration test chạy trên CSDL trong `.env`, tự tạo rồi tự xoá dữ liệu thử nghiệm. Có các ca kiểm tra
đặt hàng đồng thời (không bán vượt tồn kho) và thanh toán lặp cùng `Idempotency-Key` (chỉ 1 giao dịch).

## Cấu trúc

```
brewlite/
├── apps/
│   ├── api/        # NestJS
│   └── web/        # Next.js (menu, glass UI)
├── docs/
│   ├── requirements/   # context-and-scope.md, srs.md
│   ├── diagrams/       # sơ đồ UML (.puml + ảnh)
│   └── architecture/   # mô tả kiến trúc + ADR
├── docker-compose.yml
├── .env.example
└── README.md
```
