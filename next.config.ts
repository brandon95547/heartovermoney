import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // No development badge: wherever it sits it covers a control (the bottom navigation, the
  // back arrow, or Profile's settings gear). Build errors still show in the overlay.
  devIndicators: false,
  partialPrefetching: true,
  // Lots moved from /auction/:id to /auctions/:id, beside the new Auctions page.
  async redirects() {
    return [{ source: "/auction/:id", destination: "/auctions/:id", permanent: true }];
  },
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
