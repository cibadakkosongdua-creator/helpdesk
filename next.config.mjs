/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/lapor", destination: "/" },
      { source: "/survei", destination: "/" },
      { source: "/admin", destination: "/" },
    ]
  },
}

export default nextConfig
