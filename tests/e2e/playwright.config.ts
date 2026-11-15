import { defineConfig, devices } from '@playwright/test';

/**
 * E2E giao diện (Task 5.2) — chạy trên hệ thống đã dựng sẵn (docker compose hoặc dev server).
 *   E2E_BASE_URL: địa chỉ web (mặc định http://localhost:3000)
 *   E2E_BROWSER_CHANNEL: đặt là `chrome` để dùng Google Chrome có sẵn trên máy thay vì tải Chromium của Playwright
 * Chạy hai cấu hình: máy tính và điện thoại (mobile-first, NFR-04).
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: '../../playwright-report' }]] : 'list',
  outputDir: '../../test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'vi-VN',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
