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
