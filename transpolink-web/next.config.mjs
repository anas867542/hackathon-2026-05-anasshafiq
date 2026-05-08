/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
