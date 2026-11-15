# ADR 004 — Xác thực bằng JWT, lưu token trong localStorage

- **Trạng thái:** Chấp nhận, có trade-off đã biết
- **Ngày:** Task 3

## Bối cảnh
Khách hàng cần đăng nhập để đặt đơn và xem lịch sử (FR-08, FR-09). Frontend là ứng dụng React (Next.js) gọi API khác origin.

## Quyết định
- API cấp **JWT** khi đăng nhập; mật khẩu băm bằng **bcrypt**.
- Frontend lưu JWT trong `localStorage` (khoá `brewlite.token.v1`) và gửi trong header `Authorization: Bearer`.
- `JwtAuthGuard` bảo vệ các route tạo đơn, thanh toán và xem đơn của chính khách.

## Lý do
- Không cần session phía server, đơn giản khi API và web khác origin.
- Không cần xử lý CSRF vì token không tự gửi kèm như cookie.
- Phù hợp với mô hình SPA/PWA và kiểm thử dễ.

## Hệ quả và rủi ro
- **Rủi ro XSS:** nếu có lỗ hổng XSS, kẻ tấn công có thể đọc token từ `localStorage`. Giảm thiểu bằng React (tự escape nội dung), không dùng `dangerouslySetInnerHTML`, và token có thời hạn ngắn.
- Không thu hồi được token ngay lập tức khi đăng xuất (token vẫn hợp lệ đến khi hết hạn).

## Hướng cải tiến (ngoài phạm vi)
Chuyển sang cookie `HttpOnly; Secure; SameSite=Lax` kèm refresh token; khi đó token không đọc được từ JavaScript.

## Phương án đã cân nhắc
- **Cookie HttpOnly ngay từ đầu:** an toàn hơn nhưng cần cấu hình CORS, cookie domain và CSRF chặt chẽ hơn; vượt thời gian của Sprint 2.
- **Session phía server:** cần lưu trạng thái, khó mở rộng hơn cho MVP.
