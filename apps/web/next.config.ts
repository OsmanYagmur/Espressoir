import { existsSync } from "node:fs";

import type { NextConfig } from "next";

// One env file for the whole monorepo: the repo root's .env.local (dev project keys).
// Existing variables win, so Vercel's own environment is never overridden.
const rootEnvFile = new URL("../../.env.local", import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

// Sent with every response. No Content-Security-Policy yet: Turnstile, Google Analytics and
// Supabase each need their own allowances, and a wrong one breaks sign-in (see README →
// "Sırada ne var").
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nobody frames the site; its own pages may (the app's CAPTCHA sheet is a top-level page).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // The site asks for none of these; photos come through the file picker.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // "x-powered-by: Next.js" tells nobody anything they need.
  poweredByHeader: false,
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
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The site's own photos (public/images) carry their id in the name and change rarely:
      // a week in the browser, and a stale copy while a new one is fetched after that.
      {
        source: "/images/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // One address for the site: www answers with a permanent redirect to the apex, so
      // search engines and shared links never see two copies.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.espressoir.com" }],
        destination: "https://espressoir.com/:path*",
        permanent: true,
      },
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
