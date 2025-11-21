// Hardened dev config: Turbopack currently emits broken source maps in this project.
// Force webpack by default and fail fast if Turbopack sneaks in.
process.env.NEXT_DISABLE_TURBOPACK = process.env.NEXT_DISABLE_TURBOPACK || '1'

if (process.env.TURBOPACK === '1') {
  throw new Error(
    'Turbopack is disabled due to invalid source maps. Run with NEXT_DISABLE_TURBOPACK=1 (npm run dev) or remove --turbo.'
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {},
  },
}

module.exports = nextConfig
