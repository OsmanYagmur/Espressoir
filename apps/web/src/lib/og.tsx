import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { siteConfig } from "@espressoir/core";

import { designTokens } from "./design-tokens";

/**
 * Shared pieces of the share images (Open Graph cards). They are drawn with next/og, which
 * supports flexbox and inline styles only and reads no CSS variables, so the look of the
 * site is rebuilt here from the generated copy of the tokens: cream paper, espresso ink,
 * the display face for names, one score bar in the accent.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_COLORS = designTokens.light;

export const OG_FONTS = {
  display: "Fraunces",
  sans: "Archivo",
  mono: '"Plex Mono", "Plex Mono Ext"',
} as const;

// The font files live inside the app (src/assets/fonts) and are read by literal paths, so
// the build can see them and ship them with every server function. They used to be read
// from node_modules: under pnpm that path is a symlink, which a Vercel function does not
// contain, and since Next.js loads this module for every page's metadata, the missing
// files took all on-demand pages down with them (not just the images).
const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));

// Read once, when the module loads: the fonts never depend on the request, and keeping
// file access out of the image functions lets the images be generated at build time.
// A failure here must never break a page, so it is held back until an image asks.
//
// Each subset is registered under its own name and the two are listed as fallbacks of one
// another: registering both under one name makes the renderer use only the first.
// latin-ext carries the Turkish letters (İ, ı, ş, ğ).
const fonts = await Promise.all([
  font("fraunces-600-normal.woff"),
  font("archivo-400-normal.woff"),
  font("archivo-600-normal.woff"),
  font("ibm-plex-mono-latin-500-normal.woff"),
  font("ibm-plex-mono-latin-ext-500-normal.woff"),
]).then(
  ([fraunces, archivo, archivoSemibold, plexMono, plexMonoExt]) => [
    { name: "Fraunces", weight: 600 as const, style: "normal" as const, data: fraunces },
    { name: "Archivo", weight: 400 as const, style: "normal" as const, data: archivo },
    { name: "Archivo", weight: 600 as const, style: "normal" as const, data: archivoSemibold },
    { name: "Plex Mono", weight: 500 as const, style: "normal" as const, data: plexMono },
    { name: "Plex Mono Ext", weight: 500 as const, style: "normal" as const, data: plexMonoExt },
  ],
  (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
);

export function loadOgFonts() {
  if (fonts instanceof Error) {
    throw new Error(`Share-image fonts could not be read: ${fonts.message}`);
  }
  return fonts;
}

/** The card frame: the name on top, a label on the right, the site address at the bottom. */
export function OgFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_COLORS.bg,
        color: OG_COLORS.ink,
        padding: "48px 64px 40px",
        fontFamily: OG_FONTS.sans,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `2px solid ${OG_COLORS.line}`,
          paddingBottom: 24,
        }}
      >
        <div style={{ fontFamily: OG_FONTS.display, fontSize: 44 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 26, color: OG_COLORS["ink-2"] }}>{label}</div>
      </div>
      <div style={{ display: "flex", flex: 1 }}>{children}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${OG_COLORS.line}`,
          paddingTop: 16,
          fontSize: 24,
          color: OG_COLORS["ink-2"],
        }}
      >
        <div>{new URL(siteConfig.url).host}</div>
        <div>{siteConfig.tagline.tr}</div>
      </div>
    </div>
  );
}

/** A title in the display face, as written (no capitals added). */
export function OgTitle({ text, fontSize }: { text: string; fontSize: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: OG_FONTS.display,
        fontWeight: 600,
        fontSize,
        lineHeight: 1.08,
        letterSpacing: -fontSize * 0.01,
      }}
    >
      {text}
    </div>
  );
}

/**
 * The app icon: the first letter of the name in the display face, on crema. `scale` is
 * the letter's height against the icon; `rounded` cuts the corners (browsers show the file
 * as it is, while home screens and maskable icons are cut by the system).
 */
export function IconMark({
  size,
  scale = 0.62,
  rounded = false,
}: {
  size: number;
  scale?: number;
  rounded?: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: OG_COLORS.crema,
        color: OG_COLORS["on-crema"],
        borderRadius: rounded ? size * 0.22 : 0,
        fontFamily: OG_FONTS.display,
        fontWeight: 600,
        fontSize: size * scale,
        lineHeight: 1,
        paddingBottom: size * 0.04,
      }}
    >
      {siteConfig.name.slice(0, 1)}
    </div>
  );
}
