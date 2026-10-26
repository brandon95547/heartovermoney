import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The development badge sits at the top, clear of the bottom navigation.
  devIndicators: { position: "top-right" },
  partialPrefetching: true,
  experimental: {
    // Server Actions take 1 MB by default; posting a photo sends up to 12 MB
    // (src/app/actions/events.ts), plus the rest of the form.
    serverActions: { bodySizeLimit: "13mb" },
  },
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
