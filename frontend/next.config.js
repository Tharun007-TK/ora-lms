/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: { skipWaiting: true },
});

const apiOrigin = (() => {
  const fromEnv = process.env.API_ORIGIN || '';
  if (/^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/+$/, '');
  return 'https://ora-lms.onrender.com';
})();

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['tailwind-merge'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);