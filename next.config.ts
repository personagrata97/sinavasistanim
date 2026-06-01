import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/spl-3',
        destination: '/program/spl-duzey-3',
        permanent: true,
      },
      {
        source: '/spl-3/:slug*',
        destination: '/program/spl-duzey-3/:slug*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
