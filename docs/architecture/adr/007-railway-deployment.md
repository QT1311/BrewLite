# ADR 007 — Triển khai production trên Railway

- **Trạng thái:** Chấp nhận (sẽ xác minh khi triển khai ở Task 5)
- **Ngày:** Task 3

## Bối cảnh
Đề yêu cầu URL production hoạt động tại thời điểm chấm, HTTPS, database không public, CI/CD có registry, health check, secret ngoài repository và cách rollback. Nhóm là sinh viên, ngân sách hạn chế, không có sẵn hạ tầng.

## Quyết định
Triển khai trên **Railway** với ba dịch vụ trong một project: **web** (Next.js), **api** (NestJS, Docker image), **postgres** (có volume bền vững). Biến môi trường và secret đặt trong Railway Variables; CI build image và đẩy lên registry, sau đó trigger deploy.

## Lý do
- Hỗ trợ triển khai bằng Docker image và Dockerfile tuỳ chỉnh, khớp với pipeline "build image → push registry → deploy".
- Có health check endpoint, quản lý secret và rollback về bản trước.
- Gói Hobby khoảng 5 USD/tháng, rẻ hơn nhiều so với PostgreSQL quản lý của Fly.io (từ khoảng 38 USD/tháng) và không có chuyện web tự ngủ hay database tự hết hạn như Render free.

## Hệ quả và rủi ro
- Chi phí phát sinh theo mức dùng; ước tính web và database chạy liên tục khoảng 10 USD/tháng (ước tính, cần đối chiếu hoá đơn thực tế).
- Phụ thuộc nền tảng; chuyển đi nơi khác cần chỉnh cấu hình deploy nhưng image Docker vẫn dùng được.
- Gói miễn phí dùng thử chỉ có khoảng 5 USD và hết trong 30 ngày, nên cần thanh toán trước ngày chấm.
- **Cần xác minh khi triển khai:** HTTPS trên domain mặc định của Railway, cơ chế rollback theo từng image, và giới hạn giữ image rollback theo gói.

## Phương án đã cân nhắc
- **Render (free):** miễn phí nhưng web ngủ sau 15 phút và PostgreSQL miễn phí hết hạn sau 30 ngày; rủi ro cao khi chấm.
- **Fly.io:** không có gói miễn phí cho tổ chức mới; PostgreSQL quản lý quá đắt cho đồ án.
- **VPS + docker-compose + Caddy:** rẻ và khớp với compose, nhưng nhóm phải tự quản lý máy chủ, bảo mật và sao lưu; giữ làm phương án dự phòng.
