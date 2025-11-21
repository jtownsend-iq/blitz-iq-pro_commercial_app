// Keep config minimal and compatible with Next 16. Turbopack can be toggled via env; default to webpack in dev.
process.env.NEXT_DISABLE_TURBOPACK = process.env.NEXT_DISABLE_TURBOPACK || '1'

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
