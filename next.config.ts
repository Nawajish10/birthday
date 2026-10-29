import type { NextConfig } from "next";

process.env.NEXT_DISABLE_WORKERS = "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
  },
};
export default nextConfig;
