# ADR 002 — API là modular monolith, không tách microservice

- **Trạng thái:** Chấp nhận
- **Ngày:** Task 3

## Bối cảnh
Hệ thống có các miền nghiệp vụ: sản phẩm, xác thực, đơn hàng, thanh toán. Phạm vi là MVP cho một cửa hàng, do một nhóm sinh viên phát triển trong một học kỳ.

## Quyết định
Triển khai API như **một ứng dụng NestJS** gồm các module theo nghiệp vụ (products, auth, orders, payments, health), giao tiếp trong tiến trình qua service export.

## Lý do
- Tính nhất quán dữ liệu: đặt đơn và trừ tồn kho phải nằm trong một transaction. Tách thành dịch vụ riêng sẽ cần saga hoặc giao dịch phân tán.
- Chi phí vận hành thấp: một container, một database, một health check.
- Ranh giới module vẫn rõ, nên có thể tách sau này nếu cần.

## Hệ quả
- Một lỗi nghiêm trọng có thể làm ngừng toàn bộ API.
- Mở rộng theo chiều ngang phải nhân bản toàn bộ khối.

## Phương án đã cân nhắc
- **Microservice (products, orders, payments tách riêng):** phù hợp quy mô lớn nhưng tăng độ phức tạp gấp nhiều lần so với lợi ích của MVP. Đề bài cũng không yêu cầu.
- **API gateway riêng:** không cần thiết khi chỉ có một backend.
