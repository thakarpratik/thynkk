import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "https://thynkk-production.up.railway.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/reviews",
        destination: "/case-studies",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
