# Quy ước làm việc – BrewLite

Tài liệu này mô tả chiến lược nhánh, pull request (PR), quy ước commit và Definition of Done.
Chi tiết backlog xem `docs/process/backlog.md`.

## 1. Chiến lược nhánh (GitHub Flow rút gọn)

| Nhánh | Mục đích | Quy tắc |
|---|---|---|
| `main` | Luôn build được, luôn triển khai được | **Cấm push trực tiếp**; chỉ nhận PR đã qua CI |
| `feat/<issue>-<mô-tả-ngắn>` | Tính năng mới | VD: `feat/12-menu-loading-state` |
| `fix/<issue>-<mô-tả>` | Sửa lỗi | VD: `fix/21-payment-idempotency` |
| `docs/<mô-tả>` | Thay đổi tài liệu, sơ đồ, ADR | VD: `docs/adr-008-migrations` |
| `chore/<mô-tả>` | CI, cấu hình, phụ thuộc | VD: `chore/ci-add-lint` |

Vòng đời một thay đổi: tạo issue → tạo nhánh từ `main` mới nhất → commit nhỏ → mở PR → CI xanh →
tự review theo checklist → **Squash and merge** → xoá nhánh.
Phát hành dùng tag `vMAJOR.MINOR.PATCH` (Sprint 1 → `v0.1.0`, Sprint 2 → `v1.0.0`).

## 2. Pull request

- Mỗi PR giải quyết **một** issue, ghi `Closes #<số issue>` trong mô tả.
- PR phải dùng mẫu `.github/pull_request_template.md` (mục đích, lý do, cách kiểm thử, checklist DoD).
- Thay đổi **yêu cầu, sơ đồ hoặc kiến trúc** bắt buộc nêu rõ *lý do thay đổi* trong mô tả PR và
  cập nhật đồng thời tài liệu liên quan (SRS, `docs/diagrams`, ADR, `docs/traceability-matrix.md`).
- Merge bằng **Squash and merge** để lịch sử `main` tuyến tính, mỗi PR = một commit.

### Bảo vệ nhánh `main` (cấu hình trên GitHub)

`Settings → Branches → Add branch ruleset / protection rule` cho `main`:

1. Bật **Require a pull request before merging**.
2. Bật **Require status checks to pass before merging** và chọn 3 check: `Lint & typecheck`, `Test (unit + integration)`, `Build`.
3. Bật **Require branches to be up to date before merging**.
4. Bật **Do not allow bypassing the above settings** (kể cả admin).

Nhờ vậy PR có lint, test hoặc build lỗi sẽ **không thể merge** (đáp ứng Task 4.4 / NFR-08).

## 3. Quy ước commit (Conventional Commits)

```
<type>(<scope>): <mô tả ngắn, thì hiện tại, ≤ 72 ký tự>

[Nội dung: vì sao thay đổi – bắt buộc với thay đổi yêu cầu/kiến trúc]

Refs #<issue>
```

- `type`: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `ci`, `build`.
- `scope`: `api`, `web`, `docs`, `ci`, `db`, `deploy`.
- Ví dụ:
  - `feat(api): thêm GET /products/:id trả 404 khi không tồn tại`
  - `docs(adr): ghi ADR-007 chọn Railway làm nền tảng triển khai`
  - `ci: thêm job build sau khi test thành công`

## 4. Definition of Done

Một mục backlog chỉ được coi là **Done** khi đủ tất cả:

1. Mã nguồn đáp ứng tiêu chí chấp nhận (acceptance criteria) của issue.
2. Có kiểm thử phù hợp (unit/component; thêm integration nếu chạm DB) và **toàn bộ test xanh**.
3. `npm run lint`, `npm run typecheck`, `npm run build` đều thành công; CI trên PR **xanh**.
4. Giao diện mới dùng được trên màn hình di động (≥ 360 px), có đủ trạng thái loading / empty / error.
5. Dữ liệu vào được validate ở cả frontend và backend; không để lộ bí mật trong mã nguồn.
6. Tài liệu liên quan được cập nhật (README, SRS, sơ đồ, ADR, ma trận truy vết) và nêu lý do trong PR.
7. PR đã được tự review theo checklist, **squash merge** vào `main`, nhánh đã xoá.
8. Issue được đóng và chuyển sang cột **Done** trên bảng dự án.

## 5. Chạy kiểm tra cục bộ trước khi mở PR

```bash
npm ci
npm run lint && npm run typecheck && npm test && npm run build
```
