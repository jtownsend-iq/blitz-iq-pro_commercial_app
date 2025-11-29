// Keep config minimal and compatible with Next 16. Force webpack unless explicitly overridden.
process.env.NEXT_DISABLE_TURBOPACK = process.env.NEXT_DISABLE_TURBOPACK || '1'
process.env.NEXT_TURBOPACK = process.env.NEXT_TURBOPACK || '0'
process.env.TURBOPACK = process.env.TURBOPACK || '0'

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
