/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    isrMemoryCacheSize: 0, // Disable ISR memory cache to avoid build issues with dynamic content
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Recompute pages after 1 minute of inactivity
    pagesBufferLength: 5, // Keep 5 pages in memory
  },
}

export default nextConfig
