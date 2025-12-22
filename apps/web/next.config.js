/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,
  // Ensure we're only using App Router
  reactStrictMode: true,
  poweredByHeader: false,
  // Enable CORS headers for auth routes to support cross-port/domain usage
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' }, // Adjust dynamically if needed, or use specific origin
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
