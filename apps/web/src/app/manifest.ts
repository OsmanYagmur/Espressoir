import { siteConfig } from "@espressoir/core";
import type { MetadataRoute } from "next";

import { t } from "@/lib/i18n";

// The light paper colour of globals.css: what the screen shows while the site opens.
const PAPER = "#f4f4f1";

/**
 * What a phone needs to put the site on its home screen and open it like an app: full
 * screen, with its own icon and two shortcuts (a long press on the icon). There is no
 * service worker: the site needs the network, and an offline copy of pages that change
 * with every tasting and every sign-in would only ever be out of date.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: t.pwa.shortName,
    description: t.meta.description,
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PAPER,
    theme_color: PAPER,
    categories: ["food", "lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: t.pwa.shortcuts.newTasting,
        url: "/panel/tadim/yeni",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: t.pwa.shortcuts.feed,
        url: "/akis",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
