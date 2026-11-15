/** @type {import('next').NextConfig} */
// output: 'standalone' tạo bản build tự chứa để image Docker nhỏ và chạy bằng `node server.js`.
const nextConfig = { reactStrictMode: true, output: 'standalone' };
export default nextConfig;
