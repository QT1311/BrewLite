# ADR 005 — Kiểm soát tồn kho bằng transaction và optimistic locking

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 3

## Bối cảnh
Nhiều khách có thể đặt cùng một món tại cùng thời điểm. Nếu kiểm tra tồn kho rồi mới trừ ở hai bước riêng, hai yêu cầu có thể cùng thấy đủ hàng và bán vượt tồn kho (FR-17, rủi ro đã nêu trong context-and-scope).

## Quyết định
- Tạo đơn chạy trong **một transaction**: với mỗi sản phẩm, đọc bản ghi, kiểm tra `stock`, rồi **UPDATE có điều kiện** `WHERE id = ? AND version = ?` và tăng `version`.
- Nếu `affected = 0` (có transaction khác vừa đổi), đọc lại và thử lại, tối đa 5 lần; hết lượt thì trả 409.
- Các sản phẩm được khoá theo thứ tự `id` tăng dần để tránh deadlock.

## Lý do
- Không giữ khoá lâu trên bảng sản phẩm nên ít nghẽn khi lưu lượng thấp đến trung bình.
- Đảm bảo không âm kho: câu UPDATE chỉ thành công khi phiên bản khớp.
- Kiểm chứng được bằng test: INT-T04 (hai yêu cầu tranh một món cuối cùng) và INT-T05 (mười yêu cầu, tồn kho ba).

## Hệ quả
- Dưới tải cao, nhiều yêu cầu có thể phải thử lại; có giới hạn số lần để không lặp vô hạn.
- Khách có thể nhận 409 "đang được nhiều người đặt cùng lúc"; giao diện hướng dẫn thử lại.

## Phương án đã cân nhắc
- **Pessimistic lock toàn bộ bảng sản phẩm:** đơn giản nhưng khoá rộng, nghẽn khi nhiều món.
- **Kiểm tra trong ứng dụng không transaction:** không đảm bảo, bị race condition.
- **Hàng đợi đơn hàng:** đúng về mặt mở rộng nhưng vượt phạm vi MVP.
