# Context & Scope — BrewLite

## 1. Vấn đề nghiệp vụ

Khách hàng mua đồ uống tại quầy hiện phải xếp hàng, gọi món và thanh toán trực tiếp bằng
tiền mặt hoặc quẹt thẻ thủ công, gây mất thời gian chờ vào giờ cao điểm và khó theo dõi
lịch sử đơn hàng. BrewLite là ứng dụng web (mobile-first/PWA) cho phép khách hàng tự xem
menu, tùy chọn sản phẩm, đặt đơn và thanh toán không tiền mặt từ xa, sau đó đến quầy nhận
đồ uống — giảm thời gian chờ và cho cửa hàng dữ liệu để quản lý vận hành.

## 2. Stakeholder

| Stakeholder | Mục tiêu | Mối quan tâm |
|---|---|---|
| Khách hàng | Đặt và thanh toán đồ uống nhanh, không cần tiền mặt, theo dõi được trạng thái đơn | Giao diện dễ dùng trên điện thoại, thanh toán an toàn, không bị trừ tiền 2 lần |
| Nhân viên quầy / Barista | Nhận đơn đúng, đủ, đúng thứ tự để pha chế | Trạng thái đơn rõ ràng, không bị quá tải khi đơn dồn cùng lúc (ngoài phạm vi MVP) |
| Quản lý cửa hàng / Product Owner | Theo dõi doanh thu, tồn kho, ưu tiên backlog đúng giá trị | Dữ liệu đơn hàng chính xác, không bán vượt tồn kho |
| Giảng viên / khách hàng nghiệm thu | Đánh giá quy trình và sản phẩm đúng tiêu chí chấp nhận | Tài liệu, sơ đồ và mã nguồn nhất quán, có thể truy vết |
| Nhóm phát triển | Xây dựng đúng tiến độ Sprint, đảm bảo chất lượng | Yêu cầu rõ ràng, kiến trúc ổn định, CI/CD hoạt động |
| Đơn vị thanh toán (mock) | Xử lý giao dịch thanh toán giả lập ổn định | Idempotency, phản hồi đúng trạng thái thành công/thất bại |

## 3. Phạm vi

**Trong phạm vi MVP (in-scope):**
- Xem danh sách menu đồ uống (tên, giá, ảnh)
- Xem chi tiết sản phẩm, chọn size và topping
- Giỏ hàng: thêm / sửa / xóa, tự tính tổng tiền
- Đăng ký / đăng nhập bằng JWT
- Tạo đơn hàng
- Thanh toán không tiền mặt (mock: Ví điện tử / Thẻ)
- Xác nhận đơn (mã đơn, trạng thái) và lịch sử đơn của khách hàng

**Mở rộng (out-of-scope cho MVP, có thể làm sau):**
- Màn hình/role dành cho nhân viên quầy (tiếp nhận đơn, cập nhật trạng thái pha chế)
- Khuyến mãi nâng cao: mã theo từng khách, combo, hạn sử dụng của điểm (đã làm: mã giảm giá, tích điểm sau thanh toán và đổi điểm lấy giảm giá, FR-18, FR-25)
- Thông báo đẩy (push notification) thời gian thực
- Đa cửa hàng / đa chi nhánh

**Không thực hiện (won't do):**
- Thanh toán tiền mặt tại quầy qua hệ thống
- Ứng dụng di động native (chỉ web/PWA)
- Tích hợp cổng thanh toán thật (Momo/VNPay/Stripe thật) — chỉ mock

## 4. Giả định

- Mỗi đơn hàng thuộc về đúng một khách hàng đã đăng nhập.
- Giá sản phẩm và tồn kho được quản trị viên nhập sẵn trong CSDL (không có UI quản trị trong MVP).
- Cổng thanh toán là dịch vụ mock nội bộ, không gọi API bên ngoài thật.
- Một phiên làm việc (session) chỉ thao tác trên một giỏ hàng tại một thời điểm.

## 5. Ràng buộc

- Công nghệ bắt buộc: Next.js (frontend, mobile-first/PWA), NestJS (backend), PostgreSQL (CSDL), Docker (đóng gói).
- Thời gian phản hồi API phải dưới 500ms với dữ liệu mẫu (NFR).
- Thời hạn: hoàn thành theo tiến độ 2 Sprint của học kỳ, các task phải làm tuần tự theo đúng thứ tự Assignment 2.

## 6. Rủi ro ban đầu

- Rủi ro kỹ thuật: xử lý đặt hàng đồng thời có thể bán vượt tồn kho nếu không dùng transaction/optimistic locking đúng cách.
- Rủi ro tiến độ: nhóm làm tuần tự 5 task lớn, nếu Task 1–3 (tài liệu) kéo dài sẽ rút ngắn thời gian code ở Sprint 1–2.
- Rủi ro thanh toán: thanh toán lặp (double submit) có thể tạo trùng đơn nếu không có idempotency key — đã được yêu cầu xử lý ở Task 10 (Assignment 1) / Task 2.2 (Assignment 2).
