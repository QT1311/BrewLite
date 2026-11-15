/** Chỉ cho phép chuyển hướng trong cùng site (tránh open redirect). */
export function safeRedirect(target: string | undefined | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return '/';
  return target;
}
