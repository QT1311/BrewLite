# BrewLite — Hệ thống giao diện "Rang đậm"

Tài liệu này mô tả ngôn ngữ thiết kế của web BrewLite (`apps/web`). Toàn bộ token nằm ở đầu
`apps/web/src/app/globals.css`. Khi thêm màn hình mới, dùng lại token và class có sẵn thay vì đặt màu hoặc
cỡ chữ riêng.

## Ý tưởng

Tông tối lấy từ màu hạt cà phê rang: nền nâu đậm (không dùng đen tuyền), chữ màu kem ngà (không trắng tinh
để đỡ chói), và một màu nhấn duy nhất là crema, màu lớp bọt trên ly espresso. Ảnh đồ uống có nền sáng nên
nổi bật trên nền tối và là nơi có nhiều màu nhất trên trang.

Có hai điểm nhấn. Một là **trang mở đầu**: mỗi nhóm đồ uống là một dải lớn có ảnh to, mô tả ngắn và nút mở
thực đơn đã lọc sẵn nhóm đó. Hai là **mã đơn trên trang đặt hàng thành công**: số lớn trong khung nét đứt
như phiếu gọi món. Logo là một viên gạch bông bốn cánh vẽ bằng CSS.

## Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `#17120f` | Nền trang |
| `--surface` | `#211a16` | Khung, thẻ món, bảng |
| `--surface-2` | `#2c231e` | Nền ảnh, cột bảng quầy |
| `--field` | `#1b1512` | Nền ô nhập |
| `--line` / `--line-strong` | `#3a2f29` / `#54463d` | Đường kẻ, viền ô nhập và nút phụ |
| `--text` | `#e8ded4` | Chữ chính |
| `--text-2` | `#cdbfb2` | Chữ phụ, mô tả dài |
| `--muted` | `#a39385` | Chú thích, nhãn nhỏ (tương phản ≥ 5:1 trên mọi nền) |
| `--accent` | `#d39a5b` | Nút chính, mục đang chọn, thanh tiến độ, logo |
| `--accent-soft` | `#3a2a1c` | Nền lựa chọn đang bật (size, phương thức thanh toán) |
| `--band-*` | `#24170f`, `#1e2216`… | Nền từng dải nhóm trên trang mở đầu (cà phê nâu, trà ô liu, matcha xanh rêu…) |

Trạng thái đơn dùng cặp nền tối/chữ sáng: chờ thanh toán (vàng), đã thanh toán/đang pha (chàm),
sẵn sàng/hoàn tất (xanh lá), thất bại/đã huỷ (đỏ gạch). Mọi cặp đạt tương phản trên 7:1.

Quy tắc: chỉ một màu nhấn. Giá tiền dùng màu chữ thường, đậm hơn, chữ số đều (`tabular-nums`).

## Trang mở đầu và thực đơn

- `/` là trang mở đầu: phần giới thiệu, sáu dải nhóm (Cà phê, Trà, Matcha, Đá xay, Thức uống khác, Bánh) và
  lời mời đặt món ở cuối. Dải xen kẽ ảnh trái/phải (`.band-flip`) và mỗi dải có nền riêng.
- Nút ở mỗi dải mở `/thuc-don?nhom=<mã nhóm>`; thực đơn chọn sẵn chip nhóm đó. Mã nhóm không có món thì về
  "Tất cả".
- `/thuc-don` là thực đơn đầy đủ (lọc, tìm kiếm, lưới món) và phần "Ba bước, không cần xếp hàng".
- Khách đăng nhập xong được đưa thẳng tới `/thuc-don`; nhân viên và quản trị vẫn về `/staff`, `/admin`.

## Chữ

Một họ chữ: **Be Vietnam Pro** (400, 500, 600, 700), hỗ trợ dấu tiếng Việt đầy đủ.

| Token | Cỡ | Dùng cho |
|---|---|---|
| `--fs-xs` | 13px | Chú thích, nhãn trạng thái |
| `--fs-sm` | 15px | Điều hướng, nút, mô tả thẻ |
| (body) | 16px | Nội dung |
| `--fs-md` | 17px | Tên món, tiêu đề nhỏ |
| `--fs-lg` | 20px | Tiêu đề khung |
| `--fs-xl` | 26px | Tiêu đề mục |
| `--fs-2xl` | 36px | Tiêu đề trang |

Hero dùng 36–54px; mã đơn 64px. Tiêu đề đậm 700, giãn chữ âm nhẹ. Không viết hoa toàn bộ, không tô màu
riêng một từ trong tiêu đề, không đặt nhãn nhỏ phía trên mỗi tiêu đề.

## Bố cục

- Khung nội dung rộng tối đa 1160px, lề hai bên 24px (16px trên điện thoại).
- Căn trái mọi nơi, trừ màn hình đặt hàng thành công (căn giữa quanh mã đơn) và lời mời đặt món cuối trang mở đầu.
- Nhịp khoảng cách theo bội số 4px (8, 12, 16, 20, 24, 32, 48).
- Bo góc theo vai trò: 6px nút và ô nhập, 10px ảnh và phiếu, 14px khung lớn, tròn hẳn cho chip lọc và nhãn
  trạng thái.
- Không đổ bóng, trừ ảnh trong các dải ở trang mở đầu. Phân tầng bằng màu nền và đường kẻ 1px.
- Danh sách (lịch sử đơn, quản trị) là một khối có đường kẻ giữa các dòng, không phải nhiều thẻ rời.

## Thành phần

- **Nút chính** `.btn`: nền xanh gạch bông, chữ sáng. **Nút phụ** `.btn-secondary`: nền bề mặt, viền đậm.
  **Liên kết dạng nút** `.link-btn`: gạch chân, dùng cho thao tác phụ (Xoá, Huỷ đơn, Đăng xuất).
- **Chip lọc** `.chip-btn`: viền tròn; đang chọn thì nền chữ đậm.
- **Lựa chọn** `.chip`, `.method`: khi bật có nền `--accent-soft` và viền đôi màu nhấn.
- **Tab quản trị** `.tab`: gạch chân màu nhấn cho tab đang mở.
- **Phiếu quầy** `.ticket`: đường kẻ nét đứt ngăn danh sách món, gợi phiếu order giấy.
- **Thống kê** `.stat-grid`: một khối chia ô bằng đường kẻ, không phải bốn thẻ.
- **Trạng thái trống/lỗi** `.state-box`: viền nét đứt, luôn kèm hành động tiếp theo.

## Chuyển động

Ý tưởng "rót và đặt ly": chuyển động chậm dần rồi dừng êm như ly được đặt xuống quầy. Không nảy, không lơ
lửng. Chỉ animate `transform` và `opacity`; màu dùng transition. Mã nằm ở mục "Chuyển động" cuối
`globals.css`.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ease-settle` | `cubic-bezier(.22,.8,.24,1)` | Vào, hiện ra, nhấc lên |
| `--ease-swap` | `cubic-bezier(.45,0,.2,1)` | Đổi trạng thái qua lại |
| `--t-press` | 120ms | Nhấn nút, chip, nút +/− |
| `--t-hover` | 200ms | Hover, focus |
| `--t-state` | 280ms | Chip được chọn, nhãn trạng thái, thông báo, huy hiệu giỏ |
| `--t-reveal` | 480ms | Phần mở đầu trang `/`, ảnh dải nhóm khi cuộn |

- **Điểm nhấn duy nhất:** phần mở đầu trang `/`. Hai dòng tiêu đề, mô tả, nút hiện lần lượt; ba ly "đặt
  xuống" cách nhau 90ms; xong trong khoảng 0,85 giây. Nút bấm được ngay từ đầu.
- **Ảnh mỗi dải nhóm** hiện theo vị trí cuộn bằng CSS scroll-driven animation (`@supports`); trình duyệt không
  hỗ trợ thì ảnh đứng yên. Chữ và nút trong dải không chờ hiệu ứng.
- **Phản hồi thao tác:** nút co 0,98 khi nhấn; thẻ món nhấc 3px, ảnh phóng 1,04 khi hover (chỉ thiết bị có
  chuột); nút "Thêm vào giỏ" chuyển xanh và nhấn nhẹ khi thêm thành công (`.is-added`); huy hiệu giỏ nảy một
  nhịp khi số món đổi.
- **Thay đổi từ hệ thống:** thanh tiến độ và nhãn trạng thái đơn chuyển màu mượt khi trang tự tải lại; phiếu
  mới ở quầy, lỗi form, mã đã áp dụng và "+N điểm" hiện ra mờ dần 220ms.
- **Không dùng:** hiệu ứng hiện dần cho mọi section, hiệu ứng khi phần tử biến mất (cần thêm JavaScript),
  thư viện animation.
- `prefers-reduced-motion: reduce` tắt mọi animation và transition; nội dung hiện ngay ở trạng thái cuối.

## Ô mật khẩu

Ô mật khẩu ở trang đăng nhập/đăng ký có nút "Hiện"/"Ẩn" nằm trong ô (`.password-field`). Nút có
`aria-pressed` và tên đầy đủ cho trình đọc màn hình ("Hiện mật khẩu"/"Ẩn mật khẩu"); chỉ đổi kiểu ô nhập,
không đổi giá trị đã gõ.

## Responsive

- ≤ 1024px: lưới món 3 cột.
- ≤ 860px: lưới 2 cột; các bố cục hai cột (trang mở đầu, chi tiết, giỏ, thanh toán, bảng quầy) xếp dọc.
- ≤ 720px: thanh điều hướng thành hai hàng; hàng liên kết cuộn ngang nên không mất mục nào.
- ≤ 560px: thu nhỏ tiêu đề, ẩn mô tả trong thẻ món, dòng món quản trị xếp dọc.

## Khả năng truy cập

- Viền focus 2px màu nhấn cho mọi phần tử tương tác (`:focus-visible`).
- Chữ phụ và chú thích đạt tương phản tối thiểu 5:1 trên nền.
- Không đổi cấu trúc ngữ nghĩa, nhãn `aria-*` hay `data-testid` của component.
