import { siteConfig } from "@espressoir/core";
import type { MetadataRoute } from "next";

import { designTokens } from "@/lib/design-tokens";
import { t } from "@/lib/i18n";

// The page colour (--bg): what the screen shows while the site opens.
const PAPER = designTokens.light.bg;

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
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icon/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: t.pwa.shortcuts.newTasting,
        url: "/panel/tadim/yeni",
        icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: t.pwa.shortcuts.feed,
        url: "/akis",
        icons: [{ src: "/icon/192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
