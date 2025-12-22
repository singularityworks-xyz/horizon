/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,
  // Ensure we're only using App Router
  reactStrictMode: true,
  poweredByHeader: false,
  // No CORS headers needed - single unified application
};

module.exports = nextConfig;
