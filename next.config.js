/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force webpack in dev; disabling Turbopack because of broken source maps upstream.
  experimental: {
    turbo: {
      // Keep turbo config empty so env NEXT_DISABLE_TURBOPACK=1 reliably falls back to webpack.
    },
  },
}

module.exports = nextConfig
