/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static optimization for pages that require client-side features
  // This is necessary for Contentstack Launch deployment
  output: 'standalone', // Use standalone output for server deployment
  // Skip static generation for dynamic routes
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig

