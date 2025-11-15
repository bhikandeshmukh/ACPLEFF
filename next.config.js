/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even if there are TypeScript errors
    ignoreBuildErrors: true,
  },

  // Optimize images
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
}

module.exports = nextConfig