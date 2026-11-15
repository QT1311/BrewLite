# Kiểm thử

| Loại | Vị trí | Lệnh | Ghi chú |
|---|---|---|---|
| Unit (API) | `apps/api/src/**/*.spec.ts` | `npm test` | Jest, không cần DB |
| Unit/component (web) | `apps/web/tests` | `npm test` | Vitest + Testing Library |
| Integration (API + PostgreSQL) | `apps/api/src/__e2e__` | `npm run test:e2e` | Cần PostgreSQL đang chạy |
| E2E giao diện | `tests/e2e` | `npm run test:ui` | Playwright, cần web + api + db đang chạy |

## E2E giao diện

Kịch bản trong `tests/e2e/checkout.spec.ts`:

1. Thực đơn hiển thị và đổi được size ở trang chi tiết (FR-01, FR-02, FR-03).
2. Khách chưa đăng nhập phải đăng nhập mới đặt được đơn (FR-09).
3. Đăng ký → chọn món → đặt đơn → thanh toán thành công (FR-04, FR-07, FR-10, FR-11, FR-14).
4. Thanh toán thất bại: báo lỗi, giữ giỏ hàng, thử lại thành công (FR-12).
5. Lịch sử đơn hiển thị đơn vừa thanh toán (FR-15).
6. Admin tạo tài khoản nhân viên → khách đặt và thanh toán → khách không vào được `/staff` → nhân viên nhận đơn và bắt đầu pha (FR-19 đến FR-23). Cần `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` trùng với `ADMIN_EMAIL`, `ADMIN_PASSWORD` của API; thiếu thì kịch bản này tự bỏ qua. CI đã đặt sẵn.

Mỗi kịch bản chạy ở hai cấu hình: `desktop` và `mobile` (NFR-04).
