/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
