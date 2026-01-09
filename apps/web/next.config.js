/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cutta/shared', '@cutta/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: '*.espncdn.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;

