/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: { skipWaiting: true },
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
};

module.exports = withPWA(nextConfig);
