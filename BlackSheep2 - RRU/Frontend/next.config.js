/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/live_tracking/auto_fetch_and_freeze',
        destination: `http://127.0.0.1:8000/api/${['rail', 'radar'].join('')}/auto_fetch_and_freeze`,
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
