/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Compiler (moved out of experimental in Next.js 16)
  reactCompiler: true,
  // Enable typed routes (moved out of experimental in Next.js 16)
  typedRoutes: true,
  // Ensure we're only using App Router
  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
