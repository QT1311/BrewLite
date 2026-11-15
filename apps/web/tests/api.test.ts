import { formatVND, fetchProducts } from '@/lib/api';
import { vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

describe('api helpers', () => {
  it('formatVND định dạng tiền Việt', () => {
    expect(formatVND(35000)).toBe('35.000đ');
  });
  it('fetchProducts ném lỗi khi server trả lỗi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })));
    await expect(fetchProducts()).rejects.toThrow('503');
  });
});
