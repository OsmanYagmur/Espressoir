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
  // Files read at runtime (the share-image fonts) are shipped with every server function.
  // The build usually finds them on its own; this makes it a guarantee.
  outputFileTracingIncludes: {
    "/*": ["src/assets/fonts/*.woff"],
  },
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
