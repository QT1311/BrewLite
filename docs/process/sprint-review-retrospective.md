# Sprint Review và Sprint Retrospective — BrewLite

Dự án thực hiện một mình (một sinh viên đảm nhiệm cả ba vai Product Owner, Scrum Master và Development Team), nên các sự kiện Scrum được rút gọn nhưng vẫn ghi lại đủ nội dung. Backlog: [`backlog.md`](backlog.md). Bảng Kanban: GitHub Projects của repository.

| | Sprint 1 | Sprint 2 |
|---|---|---|
| Thời gian | _điền ngày bắt đầu – kết thúc_ | _điền ngày bắt đầu – kết thúc_ |
| Sprint Goal | Repository chuẩn, tài liệu dưới kiểm soát phiên bản, CI chặn merge lỗi, MVP xem menu chạy được | Luồng đặt – thanh toán – theo dõi đơn trọn vẹn, đóng gói tự động, có URL production truy cập được |
| Mục trong backlog | 12 (S1-01 đến S1-12) | 14 cam kết (S2-01 đến S2-14) + 1 mục Could (S2-15) |
| Hoàn thành | 12/12 (cỡ S: 7, cỡ M: 5) | 13/14 tại thời điểm viết; S2-14 (truy vết, video, review/retro) hoàn tất khi nộp bài |
| Không làm | — | S2-15 khuyến mãi, điểm thưởng (Could, chuyển sang backlog sau) |

---

## Sprint 1 — Review

**Increment:** repository `QT1311/BrewLite` có cấu trúc monorepo, tài liệu Task 1–3 trong `docs/`, API `GET /products`, `GET /products/:id`, màn hình menu mobile-first (loading, rỗng, lỗi), test tối thiểu và pipeline CI.

**Đã demo:**
- Menu nhóm theo loại, tìm kiếm không dấu, trạng thái loading/rỗng/lỗi có nút thử lại.
- CI trên Pull Request: PR #1 xanh; PR #2 cố ý lỗi bị chặn merge (bằng chứng trong [`ci-evidence.md`](ci-evidence.md)).
- Ruleset bảo vệ `main`: PR đỏ không có nút merge.

**Phản hồi và quyết định:**
- _Điền phản hồi nhận được khi demo (bạn học, giảng viên hoặc tự đánh giá với tư cách PO)._
- Quyết định đã ghi lại: dùng PostgreSQL + TypeORM (ADR 003), triển khai Railway (ADR 007).

**Cập nhật backlog sau review:** các mục giỏ hàng, đăng nhập, đặt đơn, thanh toán chuyển sang Sprint 2 như kế hoạch.

## Sprint 1 — Retrospective

**Làm tốt**
- Có ADR trước khi code nên ít phải quay lại quyết định kiến trúc.
- CI chặn PR lỗi đúng như yêu cầu NFR-08, có bằng chứng xanh và đỏ.
- Quy ước nhánh, commit và mẫu PR giữ lịch sử rõ ràng.

**Vướng mắc**
- Ruleset (branch protection) không có hiệu lực trên repository private gói miễn phí; đã chuyển repository sang Public để chặn merge có hiệu lực.
- Backlog ghi "Done" cho phần code có sẵn trước khi tạo issue; phải tạo issue và đóng bằng PR sau để lịch sử khớp.

**Hành động cho Sprint 2:** tạo issue trước khi làm, mỗi nhóm việc một nhánh và một PR; kiểm tra tính năng bảo vệ nhánh của nền tảng ngay từ đầu.

---

## Sprint 2 — Review

**Increment:** phiên bản `v1.0.0` chạy trên production.

- Web: https://web-production-97f35c81.up.railway.app
- API: https://api-production-9d99f943.up.railway.app/health
- Release: GitHub Release `v1.0.0` kèm [release notes](../release-notes/v1.0.0.md).

**Đã demo (luồng end-to-end trên production):** đăng ký → chọn món, size, topping → giỏ hàng → đặt đơn → thanh toán mock (thành công và thất bại rồi thử lại) → xác nhận đơn → lịch sử đơn; nhân viên cập nhật trạng thái bằng API `PATCH /orders/:id/status`.

**Đã chứng minh quy trình phát hành:** CI đủ lint, test, build, E2E; CD đẩy image lên GHCR rồi deploy Railway và chạy smoke test; rollback thủ công về commit trước và `/health` trả đúng `version`; tag `v1.0.0`.

**Thống kê kiểm thử:** 33 unit test web, unit test API (pricing, auth, state machine, products), 12 integration test (INT-T01…T12) trên PostgreSQL thật, 5 kịch bản Playwright chạy trên desktop và mobile. Ma trận truy vết: [`traceability-matrix.md`](../traceability-matrix.md).

**Chưa đạt, cố ý hoãn:** FR-18 (khuyến mãi, điểm thưởng); NFR-01 chưa có test hiệu năng tự động; giao diện nhân viên quầy được bổ sung sau ở v1.1.0 (Sprint 3); thanh toán chỉ là mock.

**Phản hồi và quyết định:** _điền phản hồi sau buổi demo._ Các mục hoãn được đưa lại vào Product Backlog (S2-15 và hai việc tuỳ chọn: test hiệu năng, trang `/staff`).

## Sprint 2 — Retrospective

**Làm tốt**
- Kiểm soát tồn kho và idempotency được thiết kế trước (ADR 005, 006) và có integration test chạy song song nên không sửa lại sau.
- Dockerfile, Docker Compose và E2E trong CI cho cùng một môi trường giữa máy cá nhân và CI.
- CD có quality gate, tag image theo commit SHA, smoke test kiểm tra `version` đúng commit vừa deploy, và rollback đã chạy thử thật.

**Sự cố gặp và cách xử lý**

| Sự cố | Nguyên nhân | Xử lý |
|---|---|---|
| `docker build` lỗi `ECONNRESET` khi `npm ci` | Mạng không ổn định | Thêm cấu hình retry cho npm trong Dockerfile, đổi DNS, build lại |
| Playwright không tải được trình duyệt trên máy cá nhân | Mạng chặn tải | Cho phép dùng Chrome cài sẵn qua biến `E2E_BROWSER_CHANNEL` |
| Job E2E trong CI đỏ | `ubuntu-latest` đã lên phiên bản mà Playwright 1.56 chưa hỗ trợ | Cố định `runs-on: ubuntu-24.04` |
| Lần chạy CD đầu: smoke test lỗi `Permission denied` | Script tạo từ Windows không có quyền thực thi | `git update-index --chmod=+x scripts/smoke-test.sh` |
| Web production trả 502 | Port của domain khác port ứng dụng nghe | Đặt biến `PORT` và port domain khớp nhau |
| Lần chạy CD đầu đỏ ở deploy | Service Railway còn là image giữ chỗ | Đổi nguồn sang image GHCR `:production` và chạy lại |

**Bài học**
- Phụ thuộc môi trường (phiên bản runner, quyền file, port) gây lỗi nhiều hơn logic nghiệp vụ; cần cố định phiên bản và kiểm tra sớm.
- Chạy thử pipeline CD sớm, ngay khi có service giữ chỗ, sẽ phát hiện lỗi cấu hình trước hạn nộp.

**Hành động cho các Sprint sau**
- Thêm test hiệu năng đơn giản cho `GET /products` và `POST /orders` (NFR-01).
- Làm trang `/staff` để nhân viên cập nhật đơn không cần gọi API bằng lệnh. Đã thực hiện trong Sprint 3 cùng phân quyền admin (ADR 010).
- Làm FR-18 (khuyến mãi, điểm thưởng) nếu còn thời gian.
- Theo dõi chi phí thực tế của Railway sau một tuần so với ước tính trong ADR 007.
