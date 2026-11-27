import { expect, Page } from '@playwright/test';
import { randomUUID } from 'crypto';

/** Đăng ký tài khoản mới (email ngẫu nhiên) và chờ về trang thực đơn. */
export async function registerNewUser(page: Page) {
  const email = `e2e-${randomUUID()}@test.local`;
  await page.goto('/register');
  await page.getByLabel('Tên hiển thị').fill('Khách E2E');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('matkhau123');
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(page.locator('a.card-link').first()).toBeVisible();
  return email;
}

/** Mở món đầu tiên trong thực đơn và thêm vào giỏ. */
export async function addFirstProductToCart(page: Page) {
  await page.goto('/thuc-don');
  await page.locator('a.card-link').first().click();
  await page.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await expect(page.getByRole('button', { name: /Đã thêm/ })).toBeVisible();
}

/** Từ giỏ hàng bấm "Đặt đơn" và chờ trang thanh toán của đơn mới. */
export async function placeOrderFromCart(page: Page) {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Đặt đơn' }).click();
  await expect(page).toHaveURL(/\/checkout\/\d+/);
}
