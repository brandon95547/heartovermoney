import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The development badge sits at the top, clear of the bottom navigation.
  devIndicators: { position: "top-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
