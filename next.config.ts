import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Optional: configure image optimization
  images: {
    // Use the built-in image optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
