import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // The signed-in area has nothing for a search engine.
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/giris"] },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  };
}
