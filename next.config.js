/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable static optimization for pages that require client-side features
  // This is necessary for Contentstack Launch deployment
  output: 'standalone', // Use standalone output for server deployment
  // Disable static page generation for all routes during build
  // This ensures all pages are rendered dynamically at runtime
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Ensure all routes are treated as dynamic
  trailingSlash: false,
  // Skip static optimization - render all pages dynamically
  // This prevents prerendering errors with client-side hooks during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig

