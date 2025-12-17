/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable React Compiler
    reactCompiler: true,
    // Enable typed routes
    typedRoutes: true,
  },
  // Ensure we're only using App Router
  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;

