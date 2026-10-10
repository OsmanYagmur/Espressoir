import { siteConfig } from "@espressoir/core";

/**
 * Absolute base URL for metadata, sitemap and OG images.
 * Order: explicit override → Vercel production domain → Vercel deployment URL → canonical domain.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_ENV === "production" && productionHost) {
    return new URL(`https://${productionHost}`);
  }

  const deploymentHost = process.env.VERCEL_URL;
  if (deploymentHost) return new URL(`https://${deploymentHost}`);

  return new URL(siteConfig.url);
}
