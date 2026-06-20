import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
