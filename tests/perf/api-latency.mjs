#!/usr/bin/env node
/**
 * Đo thời gian phản hồi API (NFR-01: dưới 500 ms với dữ liệu mẫu).
 *
 * Không cần cài thêm thư viện: dùng fetch có sẵn của Node 20+. Mỗi endpoint được gọi tuần tự
 * (mặc định 50 lần, sau 5 lần làm nóng), rồi tính trung bình, p50, p95 và lớn nhất.
 * Kết quả đạt khi p95 của mọi endpoint nhỏ hơn ngưỡng (mặc định 500 ms).
 *
 * Chạy: API đang chạy trên cổng 3001 (npm run dev:api hoặc docker compose up -d), rồi
 *   npm run test:perf
 * Biến môi trường tuỳ chọn: API_URL, PERF_RUNS, PERF_WARMUP, PERF_THRESHOLD_MS.
 *
 * Phép đo POST /orders tạo đơn thật rồi huỷ ngay (POST /orders/:id/cancel) để hoàn lại tồn kho,
 * và dùng một tài khoản khách riêng tạo mỗi lần chạy. Không dùng với production có dữ liệu thật.
 */

const API_URL = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const RUNS = Number(process.env.PERF_RUNS ?? 50);
const WARMUP = Number(process.env.PERF_WARMUP ?? 5);
const THRESHOLD_MS = Number(process.env.PERF_THRESHOLD_MS ?? 500);

async function call(method, path, { token, body } = {}) {
  const started = performance.now();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = performance.now() - started;
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, ms, data };
}

function percentile(sorted, p) {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

/** Gọi `step` (WARMUP + RUNS) lần; `step` trả về { ok, status, ms } của request cần đo. */
async function measure(label, step) {
  const times = [];
  for (let i = 0; i < WARMUP + RUNS; i++) {
    const r = await step();
    if (!r.ok) throw new Error(`${label}: nhận HTTP ${r.status} ở lần ${i + 1} (${JSON.stringify(r.data)})`);
    if (i >= WARMUP) times.push(r.ms);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  return { label, avg, p50: percentile(times, 50), p95: percentile(times, 95), max: times[times.length - 1] };
}

async function main() {
  const health = await call('GET', '/health').catch(() => null);
  if (!health?.ok) {
    throw new Error(`Không gọi được ${API_URL}/health. Hãy chạy API trước (npm run dev:api hoặc docker compose up -d).`);
  }

  const list = await call('GET', '/products');
  const products = Array.isArray(list.data) ? list.data : [];
  const orderable = products.filter((p) => p.stock >= 1 && p.isActive !== false);
  if (orderable.length === 0) throw new Error('Không có món nào còn hàng để đo POST /orders.');
  const product = orderable[0];
  const size = product.sizePrices ? 'M' : undefined;

  const email = `perf-${Date.now()}@example.com`;
  const password = 'matkhau-perf-123';
  const reg = await call('POST', '/auth/register', { body: { email, name: 'Perf', password } });
  if (!reg.ok) throw new Error(`Không tạo được tài khoản đo: HTTP ${reg.status}`);
  const token = reg.data.accessToken;

  const results = [
    await measure('GET /health', () => call('GET', '/health')),
    await measure('GET /products', () => call('GET', '/products')),
    await measure('GET /products/:id', () => call('GET', `/products/${product.id}`)),
    await measure('POST /auth/login', () => call('POST', '/auth/login', { body: { email, password } })),
    await measure('GET /orders/me', () => call('GET', '/orders/me', { token })),
    await measure('POST /orders', async () => {
      const r = await call('POST', '/orders', {
        token,
        body: { items: [{ productId: product.id, size, toppings: [], quantity: 1 }] },
      });
      // Huỷ ngay để hoàn tồn kho; lần huỷ không nằm trong số đo.
      if (r.ok) await call('POST', `/orders/${r.data.id}/cancel`, { token });
      return r;
    }),
  ];

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\nNFR-01: thời gian phản hồi API (${RUNS} lần/endpoint, ngưỡng p95 < ${THRESHOLD_MS} ms)`);
  console.log(`API: ${API_URL}\n`);
  console.log(`${pad('Endpoint', 20)}${pad('TB', 9)}${pad('p50', 9)}${pad('p95', 9)}${pad('Max', 9)}Kết quả`);
  let failed = false;
  for (const r of results) {
    const pass = r.p95 < THRESHOLD_MS;
    if (!pass) failed = true;
    const f = (v) => `${v.toFixed(1)}`;
    console.log(`${pad(r.label, 20)}${pad(f(r.avg), 9)}${pad(f(r.p50), 9)}${pad(f(r.p95), 9)}${pad(f(r.max), 9)}${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
  }
  console.log(failed ? '\nCó endpoint vượt ngưỡng.' : '\nTất cả endpoint đạt NFR-01.');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nLỗi: ${err.message}`);
  process.exit(1);
});
