/** @type {import('next').NextConfig} */
const backendBaseUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/live_tracking/auto_fetch_and_freeze',
        destination: `${backendBaseUrl}/api/${['rail', 'radar'].join('')}/auto_fetch_and_freeze`,
      },
      {
        source: '/api/:path*',
        destination: `${backendBaseUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
