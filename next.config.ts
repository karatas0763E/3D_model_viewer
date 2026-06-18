import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  turbopack: {},
  images: {
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: "/assets/glb/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
