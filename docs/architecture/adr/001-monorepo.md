# ADR 001 — Dùng monorepo với npm workspaces

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 3

## Bối cảnh
Dự án gồm frontend Next.js, backend NestJS, cấu hình Docker, tài liệu và CI. Đề yêu cầu một repository có cấu trúc `apps/web`, `apps/api`, `docs/`, `.github/workflows/`.

## Quyết định
Dùng một repository với **npm workspaces**. Frontend và backend là hai workspace riêng (`apps/web`, `apps/api`), dùng chung cấu hình lint và script ở thư mục gốc.

## Lý do
- Một pull request có thể thay đổi cả API lẫn giao diện (ví dụ thay đổi hình dạng DTO), tránh lệch phiên bản giữa hai kho.
- Một pipeline CI duy nhất chạy lint, test và build cho cả hai.
- Không cần công cụ phức tạp như Nx hay Turborepo cho quy mô hai ứng dụng.

## Hệ quả
- Phải quản lý phiên bản phụ thuộc cẩn thận (một `package-lock.json` ở gốc).
- CI build từng workspace riêng; khi repo lớn hơn nên cân nhắc build có cache.

## Phương án đã cân nhắc
- **Hai repository riêng:** tách bạch hoàn toàn nhưng khó đồng bộ thay đổi và tăng gấp đôi cấu hình CI.
