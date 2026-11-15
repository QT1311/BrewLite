# ADR 006 — Thanh toán có Idempotency-Key và khoá dòng đơn

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 3

## Bối cảnh
Khách có thể bấm "Thanh toán" nhiều lần hoặc mạng lỗi khiến trình duyệt gửi lại yêu cầu. Nếu không xử lý, một đơn có thể bị trừ tiền hai lần (FR-13, NFR liên quan đến toàn vẹn tiền).

## Quyết định
- Mọi `POST /payments` phải có header **`Idempotency-Key`** (8–100 ký tự). Giao diện sinh khoá mới cho mỗi lần thanh toán.
- Bảng `payments` có **UNIQUE** trên `idempotency_key`.
- Trong transaction, API **khoá dòng đơn** (`SELECT … FOR UPDATE`) để các yêu cầu cùng đơn xếp hàng, kiểm tra lại khoá, rồi mới gọi cổng thanh toán.
- Gửi lại cùng khoá: trả lại kết quả cũ, không gọi cổng. Dùng khoá đã gắn với đơn khác: trả 422.

## Lý do
- Hai lớp chặn: kiểm tra trước khi gọi cổng, và UNIQUE trong database để chặn yêu cầu song song lọt qua (xử lý lỗi `23505`).
- Kết quả thanh toán có thể kiểm chứng bằng INT-T06 đến INT-T09.

## Hệ quả
- Phía client phải giữ và gửi đúng khoá khi retry. Giao diện đã làm việc này.
- Yêu cầu thanh toán cùng đơn bị tuần tự hoá bởi khoá dòng; chấp nhận được vì một đơn chỉ thanh toán một lần.

## Phương án đã cân nhắc
- **Chỉ kiểm tra trạng thái đơn:** không đủ khi hai yêu cầu song song cùng đọc trạng thái `PENDING`.
- **Khoá phân tán (Redis):** thêm thành phần không cần thiết cho một instance API.
