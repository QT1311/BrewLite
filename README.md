# BrewLite

Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt (đồ án môn Công nghệ phần mềm).
Công nghệ: **Next.js** (web, mobile-first) · **NestJS** (API) · **PostgreSQL** · **Docker**.

## Trạng thái hiện tại — v1.1.0

Luồng nghiệp vụ trọn vẹn: **xem thực đơn → chọn size/topping → giỏ hàng → đặt đơn → thanh toán (mock) → theo dõi đơn**, cộng thêm quầy nhân viên, quản trị, mã khuyến mãi và điểm thưởng.

- [x] Monorepo `apps/api` (NestJS 11, TypeORM, PostgreSQL 16) và `apps/web` (Next.js 15, React 19, mobile-first), tài liệu trong `docs/`
- [x] Menu, chi tiết món (size, topping), giỏ hàng, đăng ký/đăng nhập JWT (bcrypt), đặt đơn, thanh toán mock có `Idempotency-Key`, xác nhận, theo dõi và lịch sử đơn
- [x] Nghiệp vụ backend: máy trạng thái đơn, thanh toán idempotent, kiểm soát tồn kho đồng thời (transaction + optimistic locking), mã khuyến mãi và điểm thưởng (FR-13, 16, 17, 18, 25)
- [x] Ba vai trò khách / nhân viên / quản trị; quầy `/staff`, quản trị `/admin` (FR-19 đến FR-24)
- [x] Giao diện tông tối "Rang đậm": trang mở đầu `/` theo từng nhóm đồ uống, thực đơn đầy đủ `/thuc-don`, chuyển động nhẹ, nút hiện/ẩn mật khẩu — xem [`DESIGN.md`](DESIGN.md)
- [x] Migration TypeORM (ADR 008), Dockerfile và Docker Compose đủ web + api + db
- [x] Kiểm thử: unit (API, web), integration (API + PostgreSQL), E2E giao diện (Playwright, desktop + mobile), đo hiệu năng API (NFR-01)
- [x] CI (Lint → Test → Build → E2E) chặn merge khi lỗi; CD (GitHub Actions → GHCR → Railway) có smoke test và rollback (ADR 009)
- [x] Production trên Railway: https://web-production-97f35c81.up.railway.app · API: https://api-production-9d99f943.up.railway.app/health

Các trang chính: `/` giới thiệu theo nhóm đồ uống, `/thuc-don` thực đơn (nhận `?nhom=<mã nhóm>`), `/products/:id` chi tiết món, `/cart` giỏ hàng, `/checkout/:id` thanh toán, `/orders` lịch sử đơn, `/login` và `/register`, `/staff` quầy, `/admin` quản trị.

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
| POST | `/orders/:id/cancel` | Huỷ đơn chưa thanh toán (hoàn kho, trả lại lượt dùng mã) | JWT |
| POST, DELETE | `/orders/:id/promotion` | Áp / đổi / gỡ mã khuyến mãi cho đơn chưa thanh toán (`POST /orders` cũng nhận `promoCode`) | JWT |
| POST, DELETE | `/orders/:id/points` | Dùng / bỏ dùng điểm thưởng cho đơn chưa thanh toán (1 điểm = 100đ, cần ≥ 100 điểm) | JWT |
| GET | `/loyalty/me` | Điểm thưởng hiện có và lịch sử cộng/dùng/hoàn điểm | JWT |
| POST | `/payments` | Thanh toán mock, bắt buộc header `Idempotency-Key` | JWT |
| GET | `/staff/orders` | Hàng đợi quầy: đơn `PAID`, `PREPARING`, `READY` | JWT staff/admin |
| PATCH | `/orders/:id/status` | Nhân viên cập nhật `PREPARING` → `READY` → `COMPLETED` | JWT staff/admin |
| GET | `/admin/stats/revenue?days=7` | Doanh thu theo ngày, món bán chạy (`days` = 7, 14 hoặc 30) | JWT admin |
| GET | `/admin/orders`, `/admin/products`, `/admin/staff` | Mọi đơn, danh sách món, danh sách nhân viên | JWT admin |
| PATCH | `/admin/products/:id` | Đặt tồn kho, ngưng bán/bán lại | JWT admin |
| POST, PATCH | `/admin/staff`, `/admin/staff/:id` | Tạo nhân viên, khoá/mở khoá | JWT admin |
| GET, POST, PATCH | `/admin/promotions`, `/admin/promotions/:id` | Xem, tạo, bật/tắt mã khuyến mãi | JWT admin |

Máy trạng thái đơn: `PENDING → PAID → PREPARING → READY → COMPLETED`; `PENDING → PAYMENT_FAILED → PAID` (thanh toán lại); `PENDING / PAYMENT_FAILED → CANCELLED`. Chuyển sai trả lỗi 409.

## Khuyến mãi và điểm thưởng
- Khách nhập mã ở bước thanh toán (`/checkout/:id`); server kiểm tra mã (đang bật, chưa hết hạn, còn lượt, đạt mức đơn tối thiểu) rồi tự tính tiền giảm. Mã không phân biệt hoa thường.
- Hai mã mẫu được tạo khi API khởi động nếu chưa có: `BREW10` (giảm 10%, tối đa 20.000đ) và `GIAM15K` (giảm 15.000đ cho đơn từ 60.000đ). Admin tạo thêm trong `/admin` → tab **Khuyến mãi**.
- Điểm thưởng: sau khi đơn thanh toán thành công, khách được 1 điểm cho mỗi 10.000đ thực trả (làm tròn xuống). Xem điểm ở trang **Đơn hàng**.
- Đổi điểm: ở trang thanh toán khách bấm **Dùng điểm** để đổi điểm thành giảm giá (1 điểm = 100đ). Cần có ít nhất 100 điểm (10.000đ), chưa đủ thì nút bị khoá. Đơn vẫn phải trả tối thiểu 1.000đ; bỏ dùng điểm hoặc huỷ đơn sẽ hoàn lại điểm. Có thể dùng cùng mã khuyến mãi.

## Tài khoản nhân viên và quản trị

- Đăng ký công khai chỉ tạo **khách hàng**. Admin đầu tiên được tạo khi API khởi động nếu có hai biến `ADMIN_EMAIL` và `ADMIN_PASSWORD` (đặt trong `.env` ở máy, trong Railway Variables ở production; mật khẩu tối thiểu 8 ký tự).
- Admin đăng nhập, vào **Quản trị** (`/admin`): doanh thu theo ngày, mọi đơn hàng, tồn kho và ngưng bán món, tạo/khoá tài khoản nhân viên.
- Nhân viên đăng nhập, vào **Quầy** (`/staff`): xem đơn đã thanh toán và bấm *Bắt đầu pha* → *Xong, sẵn sàng* → *Đã giao khách*. Trang tự làm mới mỗi 15 giây.
- Vai trò được kiểm tra ở API (ADR 010), nên khoá tài khoản có hiệu lực ngay dù token còn hạn.

## Chạy toàn bộ bằng Docker (một lệnh)

Yêu cầu: Docker Desktop đang chạy và file `.env` có `JWT_SECRET` (sao chép từ `.env.example`; thêm `ADMIN_EMAIL`, `ADMIN_PASSWORD` nếu muốn có admin).

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

**Secret:** không có trong repo. `RAILWAY_TOKEN` ở GitHub Secrets; `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL` ở Railway Variables.

## Kiểm thử

```bash
npm test                                  # unit test API + test component web
npm run test:e2e --workspace apps/api     # integration test đặt đơn/thanh toán (cần PostgreSQL đang chạy)
npm run test:perf                         # đo thời gian phản hồi API, NFR-01 (cần API đang chạy)
```

`npm run test:perf` (`tests/perf/api-latency.mjs`, không cần cài thêm gì) gọi mỗi endpoint chính 50 lần và báo trung bình, p50, p95, lớn nhất; đạt khi p95 dưới 500 ms. Phép đo `POST /orders` tạo đơn thật rồi huỷ ngay để hoàn tồn kho, nên chỉ chạy trên máy local, không chạy trên production. Đổi địa chỉ API bằng `API_URL`.

Integration test chạy trên CSDL trong `.env`, tự tạo rồi tự xoá dữ liệu thử nghiệm. Có các ca kiểm tra
đặt hàng đồng thời (không bán vượt tồn kho) và thanh toán lặp cùng `Idempotency-Key` (chỉ 1 giao dịch).

## Cấu trúc

```
brewlite/
├── apps/
│   ├── api/        # NestJS
│   └── web/        # Next.js (landing, thực đơn, giỏ hàng, quầy, quản trị)
├── docs/
│   ├── requirements/   # context-and-scope.md, srs.md
│   ├── diagrams/       # sơ đồ UML (.puml + .svg/.png)
│   └── architecture/   # mô tả kiến trúc + ADR
├── docker-compose.yml
├── .env.example
└── README.md
```
