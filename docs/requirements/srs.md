# Software Requirements Specification (rút gọn) — BrewLite

## 1. Yêu cầu chức năng (Functional Requirements)

| Mã | Mô tả | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
|---|---|---|---|
| FR-01 | Hệ thống phải hiển thị danh sách menu đồ uống (tên, giá, ảnh) | Must | Khi khách vào trang menu, danh sách sản phẩm từ `GET /products` hiển thị đủ tên, giá, ảnh trong ≤ 500ms với dữ liệu mẫu |
| FR-02 | Hệ thống phải cho phép xem chi tiết một sản phẩm | Must | Khi chọn một sản phẩm, trang chi tiết hiển thị đúng thông tin từ `GET /products/:id` |
| FR-03 | Hệ thống phải cho phép chọn size (S/M/L, mỗi món có giá riêng theo size) và topping (với món cho phép) | Must | Khi đổi size/topping, giá hiển thị cập nhật đúng theo bảng giá của món trước khi thêm vào giỏ; món chỉ có 1 cỡ không hiện lựa chọn size |
| FR-04 | Hệ thống phải cho phép thêm sản phẩm (kèm size/topping đã chọn) vào giỏ hàng | Must | Sau khi bấm "Thêm vào giỏ", số lượng trong badge giỏ hàng tăng đúng 1 |
| FR-05 | Hệ thống phải cho phép sửa số lượng hoặc xóa sản phẩm trong giỏ hàng | Must | Khi tăng/giảm số lượng hoặc xóa dòng, tổng tiền giỏ hàng cập nhật ngay, không cần tải lại trang |
| FR-06 | Hệ thống phải tự tính tổng tiền giỏ hàng | Must | Tổng tiền = tổng (đơn giá theo size/topping × số lượng) của tất cả dòng trong giỏ |
| FR-07 | Hệ thống phải cho phép khách hàng đăng ký tài khoản | Must | Đăng ký với email + mật khẩu hợp lệ tạo được tài khoản mới, mật khẩu được băm (hash) trước khi lưu |
| FR-08 | Hệ thống phải cho phép khách hàng đăng nhập và nhận JWT | Must | Đăng nhập đúng email/mật khẩu trả về JWT hợp lệ; sai thông tin trả lỗi 401 |
| FR-09 | Hệ thống phải yêu cầu đăng nhập trước khi tạo đơn hàng | Must | Gọi `POST /orders` không kèm JWT hợp lệ bị từ chối với lỗi 401 |
| FR-10 | Hệ thống phải cho phép tạo đơn hàng từ giỏ hàng hiện tại | Must | Khi bấm "Đặt đơn", `POST /orders` tạo đơn ở trạng thái PENDING với đúng danh sách sản phẩm và tổng tiền |
| FR-11 | Hệ thống phải cho phép thanh toán không tiền mặt (Ví điện tử / Thẻ, mock) | Must | Chọn phương thức và xác nhận gọi `POST /payments`; đơn chuyển PAID khi thành công |
| FR-12 | Hệ thống phải xử lý trường hợp thanh toán thất bại | Must | Khi mock payment trả lỗi, đơn chuyển PAYMENT_FAILED và giỏ hàng được giữ nguyên để khách thử lại |
| FR-13 | Hệ thống phải đảm bảo yêu cầu thanh toán lặp lại (idempotency) không tạo đơn/trừ tiền 2 lần | Should | Gửi 2 lần cùng Idempotency-Key cho `POST /payments` chỉ tạo đúng 1 giao dịch |
| FR-14 | Hệ thống phải hiển thị xác nhận đơn (mã đơn, trạng thái) sau khi thanh toán thành công | Must | Sau khi `PAID`, màn hình xác nhận hiển thị đúng mã đơn và trạng thái |
| FR-15 | Hệ thống phải cho phép khách hàng xem lịch sử đơn hàng của mình | Must | `GET /orders/me` trả đúng danh sách đơn của khách đang đăng nhập, không lộ đơn của người khác |
| FR-16 | Hệ thống phải quản lý trạng thái đơn theo một chuỗi hợp lệ (state machine) | Should | Chuyển trạng thái không hợp lệ (ví dụ COMPLETED → PENDING) bị chặn và trả lỗi |
| FR-17 | Hệ thống phải kiểm soát tồn kho khi nhiều khách đặt đồng thời | Should | Khi 2 yêu cầu đặt cùng sản phẩm/cùng lúc vượt tồn kho, chỉ 1 yêu cầu thành công, yêu cầu còn lại báo hết hàng |
| FR-18 | Hệ thống có thể áp dụng mã khuyến mãi và cộng điểm thưởng sau khi đơn PAID | Could | Nhập mã hợp lệ giảm đúng số tiền quy định; điểm thưởng cộng đúng theo tổng tiền đơn |
| FR-19 | Hệ thống phải phân quyền theo vai trò khách hàng, nhân viên (staff) và quản trị viên (admin); đăng ký công khai chỉ tạo khách hàng | Must | Gọi API của staff hoặc admin bằng token khách trả 403; token của tài khoản bị khoá trả 401; gửi `role` khi đăng ký vẫn tạo khách hàng |
| FR-20 | Nhân viên phải xem được các đơn đã thanh toán cần xử lý và chuyển trạng thái `PREPARING → READY → COMPLETED` trên màn hình quầy | Must | Trang `/staff` liệt kê đơn `PAID`, `PREPARING`, `READY` kèm món và tên khách; bấm nút chuyển đúng trạng thái kế tiếp, chuyển sai bị chặn |
| FR-21 | Admin phải xem được doanh thu theo ngày, số đơn, giá trị trung bình và món bán chạy | Should | Doanh thu chỉ tính giao dịch thanh toán thành công; đơn chưa trả, thanh toán lỗi hoặc đã huỷ không được tính |
| FR-22 | Admin phải xem được toàn bộ đơn hàng và quản lý món (đặt tồn kho, ngưng bán/bán lại) | Should | Món ngưng bán ẩn khỏi menu và không đặt được; tồn kho không nhận giá trị âm |
| FR-23 | Admin phải tạo và khoá/mở khoá tài khoản nhân viên; admin đầu tiên được tạo từ biến môi trường | Should | Staff bị khoá mất quyền ngay dù token còn hạn; admin không thể bị khoá qua API này |

## 2. Yêu cầu phi chức năng (Non-functional Requirements)

| Mã | Mô tả | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận |
|---|---|---|---|
| NFR-01 | Thời gian phản hồi API phải dưới 500ms với dữ liệu mẫu | Must | Đo bằng test hiệu năng đơn giản (ví dụ autocannon/k6) trên `GET /products` và `POST /orders` |
| NFR-02 | Mật khẩu người dùng phải được băm (hash), không lưu plaintext | Must | Kiểm tra trực tiếp cột password trong CSDL chỉ chứa hash (bcrypt) |
| NFR-03 | Mọi endpoint ghi dữ liệu phải validate dữ liệu đầu vào | Must | Gửi payload sai định dạng tới `POST /orders`, `POST /payments` trả lỗi 400 với thông điệp rõ ràng |
| NFR-04 | Giao diện phải hoạt động tốt trên trình duyệt di động (mobile-first) | Must | Giao diện hiển thị đúng bố cục ở độ rộng màn hình ≤ 400px, không bị tràn ngang |
| NFR-05 | Route tạo đơn/thanh toán phải được bảo vệ bằng JWT guard | Must | Gọi trực tiếp API không có token hợp lệ bị từ chối |
| NFR-06 | Hệ thống phải có khả năng chạy lại toàn bộ môi trường local bằng một lệnh | Should | `docker-compose up` khởi động đủ frontend, backend, database mà không cần cấu hình thủ công thêm |
| NFR-07 | Hệ thống phải có health check để giám sát khả dụng | Should | `GET /health` trả 200 khi backend và kết nối CSDL hoạt động bình thường |
| NFR-08 | Pipeline CI phải chặn merge khi lint/test/build thất bại | Should | Pull request với lỗi lint hoặc test không thể merge, pipeline báo đỏ |

## 3. Use-case diagram tổng quát

Xem `docs/diagrams/usecase-overview.puml` / `.png` — bao gồm actor Customer và Payment
Gateway (mock), với các use-case: View Menu, View Product Detail, Manage Cart, Register,
Login, Place Order, Make Payment, View Order History, Track Order Status.

Đặc tả chi tiết use-case trọng tâm UC-01 (Đặt và thanh toán đơn hàng): xem `docs/requirements/use-case-spec.md`.
