import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
      // Fail server actions fast instead of hanging for Next.js default
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
