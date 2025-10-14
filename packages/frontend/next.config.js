/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent duplicate WebSocket connections
  transpilePackages: [],
}

module.exports = nextConfig

