import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Force rebuild - 2026-01-13
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
