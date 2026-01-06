/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cutta/shared', '@cutta/ui'],
  images: {
    domains: ['localhost', 'images.unsplash.com'],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;

