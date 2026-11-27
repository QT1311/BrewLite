# ADR 011 — Khuyến mãi và điểm thưởng

- **Trạng thái:** Chấp nhận
- **Ngày:** Sau v1.0.0

## Bối cảnh
Đề Assignment 1 (Task 10) yêu cầu áp mã giảm giá hợp lệ và cộng điểm tích lũy cho khách sau khi đơn `PAID`. Cần làm sao cho tiền giảm luôn do server tính, số lượt dùng mã không bị vượt khi nhiều khách đặt đồng thời, và điểm không bị cộng hai lần khi thanh toán bị gửi lại.

## Quyết định
- **Bảng `promotions`** (mã duy nhất, loại `PERCENT`/`FIXED`, giá trị, đơn tối thiểu, mức giảm tối đa, số lượt tối đa, `used_count`, hạn dùng, `is_active`). Hàm thuần `computeDiscount`/`checkEligibility` (`promotions/promotion.ts`) tính tiền giảm và lý do từ chối nên dễ unit test. Sau giảm, đơn vẫn phải trả tối thiểu 1.000đ.
- **Giữ lượt dùng bằng `UPDATE` có điều kiện** (`used_count = used_count + 1 WHERE used_count < max_uses AND is_active AND chưa hết hạn`) trong cùng transaction với đơn. Hai khách tranh lượt cuối cùng: `UPDATE` của một bên trả `affected = 0` và bên đó nhận 422, transaction rollback nên không giữ tồn kho. Cách này giống tinh thần optimistic locking của tồn kho (ADR 005) mà không cần khoá bảng.
- **Lượt dùng được giữ khi đơn có mã** (không chờ đến lúc trả tiền) và được trả lại khi huỷ đơn hoặc khi khách đổi/gỡ mã; thanh toán thất bại vẫn giữ vì đơn còn thanh toán lại được. Cùng quy tắc với tồn kho.
- **Đơn lưu `promotion_id` (FK, `ON DELETE SET NULL`), `promotion_code` (bản chụp) và `discount_amount`**; `total` là số tiền phải trả sau giảm nên `PaymentsService` không phải đổi (vẫn thu `order.total`). Tạm tính = `total + discount_amount`.
- **Điểm thưởng:** `floor(total / 10.000)` tính trên số tiền thực trả. Cộng trong cùng transaction với việc chuyển đơn sang `PAID` (đơn đang bị khoá dòng), ghi một dòng vào `loyalty_transactions` và tăng `users.loyalty_points`. `UNIQUE(order_id, type)` là chốt chặn cuối cùng; gửi lại cùng `Idempotency-Key` chỉ phát lại kết quả cũ nên không cộng thêm.
- Khách áp mã ở trang thanh toán qua `POST /orders/:id/promotion` (và `POST /orders` cũng nhận `promoCode`); admin quản lý mã qua `/admin/promotions`. Hai mã mẫu `BREW10`, `GIAM15K` được tạo khi khởi động nếu chưa tồn tại.

- **Đổi điểm (FR-25):** 1 điểm = 100đ, cần tối thiểu 100 điểm (10.000đ); `POST /orders/:id/points` dùng tối đa số dư sao cho đơn còn trả ≥ 1.000đ, `DELETE` để bỏ dùng. Trừ điểm bằng `UPDATE ... WHERE loyalty_points >= n` nên hai đơn dùng điểm đồng thời không làm số dư âm (một bên nhận 409/422). Mỗi lần trừ hoặc hoàn ghi một dòng sổ (`REDEEM` âm, `REFUND` dương); chỉ `EARN` có chỉ mục duy nhất một phần trên `order_id`. Đơn lưu `points_redeemed`, `points_discount`; đổi mã khuyến mãi thì hoàn rồi tính lại điểm. Huỷ đơn hoàn điểm; thanh toán thất bại vẫn giữ điểm vì đơn còn thanh toán lại được (giống tồn kho và mã). Điểm tích sau thanh toán tính trên số tiền thực trả, tức sau cả mã lẫn điểm.

## Hệ quả
- Thêm hai bảng và bốn cột (migration `AddPromotionsAndLoyalty`, chỉ thêm nên tương thích ngược với image cũ theo ADR 009; có `down`).
- Chưa có mã theo từng khách, mỗi khách chỉ dùng một lần hoặc hạn sử dụng của điểm; đó là phần mở rộng nếu cần.
- Tỷ lệ tích (1 điểm/10.000đ) và đổi (1 điểm = 100đ) là hằng số trong `loyalty/loyalty.ts`; đổi tỷ lệ chỉ cần sửa tại đó.
- Nếu hủy đơn đã `PAID` được cho phép trong tương lai thì phải bổ sung bút toán điểm âm; hiện state machine không cho huỷ đơn đã trả tiền.

## Phương án đã cân nhắc
- **Chỉ trừ lượt khi thanh toán thành công:** hai đơn cùng giữ một mã nhưng chỉ một đơn trả được, gây lỗi bất ngờ ở bước thanh toán.
- **Khoá bảng hoặc `SELECT ... FOR UPDATE` trên mã:** đúng nhưng làm nhiều khách xếp hàng trên cùng một mã; `UPDATE` có điều kiện nhẹ hơn.
- **Tính điểm từ tạm tính (trước giảm giá):** khách được điểm cho số tiền không phải trả, nên chọn tính từ số tiền thực trả.
