/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7100/med-supplies-api/api/v1/',
  },

  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",


  output: 'standalone',
  // Disable image optimization for standalone mode
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
