# ADR 008 — Quản lý schema bằng migration TypeORM

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 5.2

## Bối cảnh
Giai đoạn phát triển dùng `synchronize` để TypeORM tự tạo bảng. Cách này không an toàn trên production: có thể xoá cột hoặc dữ liệu khi entity đổi, và không có lịch sử thay đổi để rollback.

## Quyết định
- Schema chỉ thay đổi qua **migration** có version, lưu trong `apps/api/src/database/migrations/`.
- Migration khởi tạo `InitialSchema` được **sinh tự động** từ entity (`npm run migration:generate`) rồi rà soát bằng tay.
- API **tự chạy migration khi khởi động** (`migrationsRun`, tắt bằng `DB_MIGRATIONS_RUN=false`). Trên Railway, điều này đảm bảo schema đúng trước khi API nhận request.
- `synchronize` **mặc định tắt**; chỉ bật khi đặt `DB_SYNCHRONIZE=true` để thử nghiệm cục bộ.
- Cấu hình kết nối dùng chung (`database.config.ts`) cho ứng dụng và TypeORM CLI (`data-source.ts`). Production dùng `DATABASE_URL`; local/CI dùng `POSTGRES_*`.
- Dữ liệu mẫu (seed) nạp bởi `ProductsService.onModuleInit`, chạy sau migration, đồng bộ theo tên sản phẩm và lưu trữ (archive) món đã bị bỏ.
- **Baseline:** migration đầu tiên bỏ qua việc tạo bảng nếu bảng `users` đã tồn tại, để CSDL phát triển cũ (tạo bằng `synchronize`) chuyển sang migration mà không mất dữ liệu.

## Lý do
- Có lịch sử thay đổi schema, có thể chạy lại và hoàn tác (`down`) khi rollback.
- Môi trường mới (CI, production, máy thành viên mới) dựng schema giống hệt nhau chỉ bằng chạy API.
- Integration test chạy trên CSDL trống nên đồng thời kiểm chứng migration.

## Hệ quả
- Mỗi thay đổi entity phải kèm migration mới (`npm run migration:generate -- src/database/migrations/<Ten>`) và được thêm vào `migrations/index.ts`.
- Mỗi migration phải có bước `down`; nếu migration mới có thể làm mất dữ liệu, cần sao lưu trước khi deploy.
- Chạy migration khi khởi động đơn giản nhưng nếu sau này chạy nhiều bản API cùng lúc cần tách thành bước riêng.

## Phương án đã cân nhắc
- **Giữ `synchronize` trên production:** nhanh nhưng nguy hiểm, bị loại.
- **Chạy migration thủ công/bước CD riêng:** an toàn hơn khi mở rộng nhưng phức tạp hơn cho đồ án một API instance.
