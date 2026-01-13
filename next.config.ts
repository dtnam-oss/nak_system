import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Force rebuild - clear cache
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
