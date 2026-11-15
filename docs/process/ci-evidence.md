# Minh chứng CI (Task 4.4)

Pipeline: `.github/workflows/ci.yml` – **Install (`npm ci`) → Lint (`eslint` + `tsc`) → Unit/Integration Test → Build**,
tự chạy khi mở hoặc cập nhật Pull Request vào `main`.

| Mục | Nội dung |
|---|---|
| Link repository | https://github.com/QT1311/BrewLite |
| PR pipeline **thành công** | https://github.com/QT1311/BrewLite/pull/1 (nhánh `docs/test-pr-green`): Lint & typecheck ✓, Test ✓, Build ✓ (3/3), đã merge vào `main` |
| PR pipeline **phát hiện lỗi** | https://github.com/QT1311/BrewLite/pull/2 (nhánh `test/ci-should-fail`): Lint & typecheck ✓, **Test (unit + integration) ✗** do assert sai trong `pricing.spec.ts`; Build không chạy vì phụ thuộc Test. PR đã đóng, không merge |
| Branch protection | Ruleset `protect-main` (Active): yêu cầu PR, yêu cầu check xanh, chặn force push |

## Cách tạo minh chứng

**PR xanh**
```bash
git switch -c docs/add-contributing
git add CONTRIBUTING.md && git commit -m "docs: thêm quy ước làm việc"
git push -u origin docs/add-contributing   # rồi mở PR trên GitHub
```

**PR đỏ (cố ý, để chứng minh CI chặn lỗi)**
```bash
git switch main && git switch -c test/ci-should-fail
# Sửa một test cho sai, ví dụ đổi expect(...).toBe(...) thành giá trị sai trong apps/api/src/catalog/pricing.spec.ts
git commit -am "test: cố ý làm hỏng test để kiểm tra CI"
git push -u origin test/ci-should-fail     # mở PR → job Test đỏ, nút Merge bị khoá
```
Chụp màn hình rồi **đóng PR đỏ (không merge)** và xoá nhánh.
