/**
 * Single source of truth for the product's name and canonical URL.
 * Change the name or domain here and every app (web, later mobile) follows.
 */
export const siteConfig = {
  name: "Espressoir",
  /** Canonical production URL. Apps may override it per deployment (e.g. preview URLs). */
  url: "https://espressoir.com",
  locale: "tr-TR",
  /** Kept out of the i18n dictionary on purpose: it is part of the brand, not UI copy. */
  tagline: {
    tr: "Her fincanın bir hatırası var.",
    en: "Every cup, remembered.",
  },
} as const;

export type SiteConfig = typeof siteConfig;
