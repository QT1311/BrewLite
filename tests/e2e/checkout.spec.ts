import { expect, test } from '@playwright/test';
import { addFirstProductToCart, placeOrderFromCart, registerNewUser } from './helpers';

test.describe('Luồng mua hàng end-to-end', () => {
  test('thực đơn hiển thị sản phẩm và đổi được size ở trang chi tiết', async ({ page }) => {
    await page.goto('/thuc-don');
    await expect(page.locator('a.card-link').first()).toBeVisible();
    await page.locator('a.card-link').first().click();

    const sizes = page.locator('input[name="size"]');
    await expect(sizes.nth(1)).toBeAttached(); // món đầu thực đơn là đồ uống có nhiều size
    const addButton = page.getByRole('button', { name: /Thêm vào giỏ/ });
    const before = await addButton.textContent();
    await sizes.nth(1).check({ force: true });
    await expect(addButton).not.toHaveText(before ?? '');
  });

  test('khách chưa đăng nhập phải đăng nhập mới đặt được đơn', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/cart');
    await expect(page.getByRole('link', { name: 'Đăng nhập để đặt đơn' })).toBeVisible();
  });

  test('đăng ký → chọn món → đặt đơn → thanh toán thành công', async ({ page }) => {
    await registerNewUser(page);
    await addFirstProductToCart(page);
    await placeOrderFromCart(page);

    await page.getByRole('button', { name: /Xác nhận trả/ }).click();

    await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();
    await expect(page.getByTestId('order-code')).toContainText('#');
    await expect(page.getByText('Đã thanh toán').first()).toBeVisible();
  });

  test('thanh toán thất bại: giữ giỏ hàng, báo lỗi rõ ràng và thử lại thành công', async ({ page }) => {
    await registerNewUser(page);
    await addFirstProductToCart(page);
    await placeOrderFromCart(page);

    await page.getByLabel('Giả lập thanh toán thất bại (demo)').check();
    await page.getByRole('button', { name: /Xác nhận trả/ }).click();

    await expect(page.locator('.form-error')).toContainText('Giỏ hàng vẫn được giữ');
    await expect(page.getByText('Thanh toán thất bại').first()).toBeVisible();

    // Thử lại với thanh toán bình thường trên cùng đơn
    await page.getByLabel('Giả lập thanh toán thất bại (demo)').uncheck();
    await page.getByRole('button', { name: /Xác nhận trả/ }).click();
    await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();
  });

  test('lịch sử đơn hiển thị đơn vừa thanh toán', async ({ page }) => {
    await registerNewUser(page);
    await addFirstProductToCart(page);
    await placeOrderFromCart(page);
    await page.getByRole('button', { name: /Xác nhận trả/ }).click();
    await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();

    await page.goto('/orders');
    await expect(page.getByText('Đã thanh toán').first()).toBeVisible();
  });

  test('áp mã khuyến mãi ở bước thanh toán → trả tiền đã giảm → nhận điểm thưởng', async ({ page }) => {
    await registerNewUser(page);
    await addFirstProductToCart(page);
    await placeOrderFromCart(page);

    await page.getByLabel('Mã khuyến mãi').fill('brew10'); // không phân biệt hoa thường
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.getByTestId('promo-applied')).toContainText('BREW10');
    await expect(page.getByTestId('order-discount')).toContainText('−');
    await expect(page.getByRole('button', { name: /Xác nhận trả/ })).toBeVisible();

    await page.getByRole('button', { name: /Xác nhận trả/ }).click();
    await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();
    await expect(page.getByTestId('order-discount')).toContainText('−');
    await expect(page.getByTestId('points-earned')).toContainText('điểm thưởng');

    await page.goto('/orders');
    await expect(page.getByTestId('loyalty-points')).toContainText('Điểm thưởng của bạn');
  });

  test('mã khuyến mãi sai bị từ chối và không đổi tổng tiền', async ({ page }) => {
    await registerNewUser(page);
    await addFirstProductToCart(page);
    await placeOrderFromCart(page);
    const before = await page.getByTestId('order-total').textContent();

    await page.getByLabel('Mã khuyến mãi').fill('KHONGTONTAI');
    await page.getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('.form-error')).toContainText('Mã khuyến mãi không tồn tại');
    await expect(page.getByTestId('order-total')).toHaveText(before ?? '');
  });
});

test.describe('Nhân viên quầy và quản trị', () => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!adminEmail || !adminPassword, 'Đặt E2E_ADMIN_EMAIL và E2E_ADMIN_PASSWORD (trùng ADMIN_EMAIL/ADMIN_PASSWORD của API) để chạy');

  async function login(page: import('@playwright/test').Page, email: string, password: string) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
  }

  test('admin tạo nhân viên → khách đặt và trả → nhân viên nhận đơn và bắt đầu pha', async ({ page }) => {
    const staffEmail = `e2e-staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const staffPassword = 'matkhau-nhanvien-1';

    // 1) Admin đăng nhập, vào trang quản trị và tạo tài khoản nhân viên
    await login(page, adminEmail!, adminPassword!);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByTestId('stat-revenue')).toBeVisible();
    await page.getByRole('tab', { name: 'Nhân viên' }).click();
    await page.getByLabel('Tên', { exact: true }).fill('Nhân viên E2E');
    await page.getByLabel('Email').fill(staffEmail);
    await page.getByLabel('Mật khẩu ban đầu').fill(staffPassword);
    await page.getByRole('button', { name: 'Tạo nhân viên' }).click();
    await expect(page.getByTestId('staff-row').filter({ hasText: staffEmail })).toBeVisible();
    await page.getByRole('button', { name: 'Đăng xuất' }).click();

    // 2) Khách đặt và thanh toán một đơn
    await registerNewUser(page);
    await addFirstProductToCart(page);
    await placeOrderFromCart(page);
    const orderId = page.url().match(/\/checkout\/(\d+)/)![1];
    await page.getByRole('button', { name: /Xác nhận trả/ }).click();
    await expect(page.getByRole('heading', { name: 'Đặt hàng thành công' })).toBeVisible();

    // 3) Khách hàng không vào được trang quầy
    await page.goto('/staff');
    await expect(page.getByText('Bạn không có quyền truy cập')).toBeVisible();
    await page.getByRole('button', { name: 'Đăng xuất' }).click();

    // 4) Nhân viên đăng nhập, thấy đơn ở cột "Mới" và chuyển sang "Đang pha"
    await login(page, staffEmail, staffPassword);
    await expect(page).toHaveURL(/\/staff$/);
    const ticket = page.getByTestId('col-PAID').getByTestId('ticket').filter({ hasText: `Đơn #${orderId}` });
    await expect(ticket).toBeVisible();
    await ticket.getByRole('button', { name: 'Bắt đầu pha' }).click();
    await expect(page.getByTestId('col-PREPARING').getByTestId('ticket').filter({ hasText: `Đơn #${orderId}` })).toBeVisible();
  });
});
