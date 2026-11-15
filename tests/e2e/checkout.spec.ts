import { expect, test } from '@playwright/test';
import { addFirstProductToCart, placeOrderFromCart, registerNewUser } from './helpers';

test.describe('Luồng mua hàng end-to-end', () => {
  test('thực đơn hiển thị sản phẩm và đổi được size ở trang chi tiết', async ({ page }) => {
    await page.goto('/');
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
});
