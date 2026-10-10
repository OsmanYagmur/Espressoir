import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static-first rendering: public pages are prerendered and cached ("use cache"),
  // which keeps Vercel Hobby function usage close to zero.
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@espressoir/core", "@espressoir/db", "@espressoir/i18n"],
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
