import { existsSync } from "node:fs";

import type { NextConfig } from "next";

// One env file for the whole monorepo: the repo root's .env.local (dev project keys).
// Existing variables win, so Vercel's own environment is never overridden.
const rootEnvFile = new URL("../../.env.local", import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  // Static-first rendering: public pages are prerendered and cached ("use cache"),
  // which keeps Vercel Hobby function usage close to zero.
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  // Files read at runtime (the share-image fonts, the Bilgi articles) are shipped with every
  // server function. The build usually finds them on its own; this makes it a guarantee.
  outputFileTracingIncludes: {
    "/*": ["src/assets/fonts/*.woff", "src/content/bilgi/*.md"],
  },
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@espressoir/core", "@espressoir/db", "@espressoir/i18n"],
  // The admin pages and the workshop moved on 2026-10-24 (to /osman and to /workshop);
  // old links, bookmarks and shared addresses still arrive.
  async redirects() {
    return [
      { source: "/panel/yonetim", destination: "/osman/yonetim", permanent: false },
      { source: "/atolye", destination: "/workshop", permanent: true },
      { source: "/atolye/:id", destination: "/workshop/:id", permanent: true },
    ];
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
