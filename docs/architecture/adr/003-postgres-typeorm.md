# ADR 003 — PostgreSQL với TypeORM

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 3

## Bối cảnh
Đề yêu cầu PostgreSQL. Cần một ORM làm việc tốt với NestJS, hỗ trợ transaction, khoá dòng và migration.

## Quyết định
Dùng **PostgreSQL 16** và **TypeORM 0.3** qua `@nestjs/typeorm`. Entity khai báo bằng decorator; cột tiền dùng kiểu `int` (đơn vị đồng) để tránh sai số số thực.

## Lý do
- TypeORM tích hợp sẵn với NestJS, có `DataSource.transaction`, `pessimistic_write` lock và `@VersionColumn` cho optimistic locking (dùng ở ADR 005).
- Tiền lưu dạng số nguyên đồng, không dùng float.
- PostgreSQL có UNIQUE index và transaction đầy đủ, cần cho idempotency (ADR 006).

## Hệ quả
- `synchronize` chỉ dùng cho môi trường phát triển. Trên production phải dùng migration có version; đây là việc còn lại của Task 5.2.
- Phụ thuộc vào hành vi của TypeORM khi sinh SQL; các truy vấn quan trọng được kiểm chứng bằng integration test.

## Phương án đã cân nhắc
- **Prisma:** tốt về kiểu dữ liệu nhưng transaction và khoá dòng phức tạp hơn trong tình huống cần `FOR UPDATE` và `version` thủ công.
- **SQL thuần:** kiểm soát tốt nhất nhưng tốn thời gian viết và bảo trì.
