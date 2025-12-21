/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,
  // Ensure we're only using App Router
  reactStrictMode: true,
  poweredByHeader: false,

  // Add CORS headers for cross-origin requests from web-client
  async headers() {
    return [
      {
        // Apply to all routes (including API routes)
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'http://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Cookie, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
