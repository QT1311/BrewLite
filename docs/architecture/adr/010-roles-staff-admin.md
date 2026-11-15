# ADR 010 — Vai trò khách hàng, nhân viên và quản trị

- **Trạng thái:** Chấp nhận
- **Ngày:** Sau v1.0.0

## Bối cảnh
Bản v1.0.0 chỉ có khách hàng. Việc nhân viên cập nhật đơn dùng khoá chung `STAFF_API_KEY` gửi qua header, không có màn hình, không biết ai thao tác và không thu hồi được riêng từng người. Cần thêm nhân viên quầy xử lý đơn và admin xem doanh thu, quản lý món và tài khoản nhân viên.

## Quyết định
- Thêm cột `users.role` (`customer` | `staff` | `admin`, mặc định `customer`) và `users.is_active` (mặc định `true`). Thêm `products.is_active` để ngưng bán món. Cả ba nằm trong migration `AddRolesAndProductActive` (chỉ thêm cột có giá trị mặc định nên tương thích ngược với image cũ, theo ADR 009).
- Phân quyền bằng `JwtAuthGuard` rồi `RolesGuard` với decorator `@Roles(...)`. `RolesGuard` **đọc lại vai trò và trạng thái từ CSDL** ở mỗi request, không tin vai trò trong token, nên khoá tài khoản hoặc đổi quyền có hiệu lực ngay.
- Đăng ký công khai luôn tạo `customer` (DTO không nhận `role`). Staff do admin tạo qua `POST /admin/staff`. Admin đầu tiên được tạo khi API khởi động từ `ADMIN_EMAIL` và `ADMIN_PASSWORD` (Railway Variables); nếu email đã tồn tại thì chỉ nâng lên admin, không đổi mật khẩu.
- Bỏ `StaffKeyGuard` và `STAFF_API_KEY`: `PATCH /orders/:id/status` giờ cần JWT của staff hoặc admin. Có đúng một cơ chế xác thực.
- Doanh thu = tổng giao dịch thanh toán `SUCCEEDED`, nhóm theo ngày giờ Việt Nam (`Asia/Ho_Chi_Minh`).
- Admin chỉ sửa tồn kho và trạng thái bán của món, không sửa giá, vì giá được đồng bộ từ thực đơn gốc mỗi lần API khởi động (xem `ProductsService.onModuleInit`).

## Hệ quả
- Mỗi request tới route theo vai trò tốn thêm một truy vấn `SELECT` theo khoá chính; chấp nhận được với quy mô đồ án.
- Nếu admin đầu tiên quên mật khẩu, đổi `ADMIN_PASSWORD` không có tác dụng với tài khoản đã tồn tại; phải đặt lại mật khẩu trực tiếp trong CSDL hoặc dùng email khác.
- Biến `STAFF_API_KEY` còn trong Railway/`.env` cũ không còn được dùng và có thể xoá.
- Migration chỉ thêm cột; rollback image về v1.0.0 vẫn chạy được trên schema mới (cột thừa bị bỏ qua).

## Phương án đã cân nhắc
- **Giữ khoá staff chung:** đơn giản nhưng không biết ai làm gì và không thu hồi riêng từng người.
- **Tài khoản staff/admin cố định trong migration:** mật khẩu mặc định nằm trong mã nguồn, không an toàn.
- **Đăng ký staff công khai có mã mời:** thêm cơ chế mới mà vẫn cần admin quản lý, nên chọn admin tạo trực tiếp.
