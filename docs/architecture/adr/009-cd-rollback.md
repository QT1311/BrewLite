# ADR 009 — Chiến lược CD và rollback

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 5

## Bối cảnh
Đề yêu cầu pipeline CD gồm Push/Tag → Lint + Test → Build image → Push registry → Deploy → Smoke test; image gắn tag theo commit SHA hoặc semver; migration an toàn; pipeline dừng và có rollback khi lỗi; không để lộ secret.

## Quyết định
- Workflow `cd.yml` chạy khi push vào `main` hoặc khi đẩy tag `vX.Y.Z`. Job đầu gọi lại `ci.yml` (`workflow_call`) làm cổng chất lượng: lint, test, build và E2E; chỉ khi xanh mới build image.
- Image `brewlite-api` và `brewlite-web` đẩy lên GHCR với tag là **commit SHA đầy đủ** (bất biến). Khi deploy, tag trôi `production` được trỏ vào SHA đó; nếu build từ tag git thì thêm tag semver `vX.Y.Z`.
- Railway chạy hai service từ `ghcr.io/<owner>/brewlite-*:production`. Pipeline ghi lại digest `production` hiện tại, đổi tag, rồi gọi `railway redeploy` để kéo lại image.
- Smoke test (`scripts/smoke-test.sh`) kiểm tra `/health` (status ok, `version` đúng SHA vừa deploy), `/products` không rỗng và web trả 200.
- **Smoke test lỗi:** pipeline đánh dấu thất bại, trỏ `production` về digest trước đó, redeploy và chạy lại smoke test. Rollback thủ công dùng `rollback.yml` với SHA hoặc tag cần khôi phục.
- Biến `APP_VERSION` được gán từ build-arg `GIT_SHA` để `/health` cho biết đang chạy commit nào.

## Migration an toàn
Migration chạy tự động khi `api` khởi động (ADR 008) và chỉ thêm cột/bảng theo kiểu tương thích ngược (expand), nên image cũ vẫn chạy được trên schema mới. Mỗi migration có `down`; nếu cần hoàn tác dữ liệu thì chạy `npm run migration:revert` trước khi rollback code.

## Secret
`RAILWAY_TOKEN` (project token) nằm trong GitHub Secrets; `GITHUB_TOKEN` tự cấp để đẩy GHCR; URL production nằm trong GitHub Variables (không bí mật). Secret ứng dụng (`JWT_SECRET`, `STAFF_API_KEY`, `DATABASE_URL`) chỉ nằm trong Railway Variables. Workflow không in giá trị secret.

## Hệ quả
- Image GHCR để Public vì gói Hobby của Railway không hỗ trợ registry riêng; image không chứa secret vì mọi cấu hình đưa vào lúc chạy.
- `NEXT_PUBLIC_API_URL` được nhúng lúc build web, nên cần biến `PROD_API_URL` trước lần deploy đầu.
- Redeploy gây gián đoạn ngắn (không blue/green); chấp nhận được với đồ án.
- Gói Hobby chỉ giữ deployment cũ trong thời gian giới hạn; vì vậy rollback dựa vào tag/digest trên GHCR thay vì lịch sử của Railway.
