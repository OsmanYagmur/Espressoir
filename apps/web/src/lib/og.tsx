import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { siteConfig } from "@espressoir/core";

/**
 * Shared pieces of the share images (Open Graph cards). They are drawn with next/og, which
 * supports flexbox and inline styles only, so the look of the site is rebuilt here by
 * hand: paper, ink, one red square.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

// The light-theme tokens of globals.css, as plain hex (next/og does not read CSS variables).
export const OG_COLORS = {
  paper: "#f4f4f1",
  ink: "#161616",
  muted: "#6b6a64",
  brand: "#c8372b",
  white: "#ffffff",
} as const;

export const OG_FONTS = {
  display: '"Archivo", "Archivo Ext"',
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
  font("archivo-latin-800-normal.woff"),
  font("archivo-latin-ext-800-normal.woff"),
  font("ibm-plex-mono-latin-500-normal.woff"),
  font("ibm-plex-mono-latin-ext-500-normal.woff"),
]).then(
  ([archivo, archivoExt, plexMono, plexMonoExt]) => [
    { name: "Archivo", weight: 800 as const, style: "normal" as const, data: archivo },
    { name: "Archivo Ext", weight: 800 as const, style: "normal" as const, data: archivoExt },
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

/** The card frame: wordmark on top, a label on the right, the site address at the bottom. */
export function OgFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_COLORS.paper,
        color: OG_COLORS.ink,
        padding: "44px 56px 40px",
        fontFamily: OG_FONTS.mono,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `4px solid ${OG_COLORS.ink}`,
          paddingBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 26, height: 26, background: OG_COLORS.brand, marginRight: 18 }} />
          <div style={{ fontFamily: OG_FONTS.display, fontSize: 38, letterSpacing: -1 }}>
            {siteConfig.name.toUpperCase()}
          </div>
        </div>
        <div style={{ fontSize: 22, color: OG_COLORS.muted, letterSpacing: 2 }}>{label}</div>
      </div>
      <div style={{ display: "flex", flex: 1 }}>{children}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${OG_COLORS.ink}`,
          paddingTop: 16,
          fontSize: 22,
          color: OG_COLORS.muted,
        }}
      >
        <div>{new URL(siteConfig.url).host}</div>
        <div>{siteConfig.tagline.tr}</div>
      </div>
    </div>
  );
}

/**
 * A display title ending in the red full stop. next/og has no inline text flow, so the
 * title is laid out word by word in a wrapping row, with the stop attached to the last word.
 */
export function OgTitle({ text, fontSize }: { text: string; fontSize: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: fontSize * 0.24,
        fontFamily: OG_FONTS.display,
        fontSize,
        lineHeight: 0.98,
        letterSpacing: -fontSize * 0.03,
      }}
    >
      {words.map((word, index) =>
        index < words.length - 1 ? (
          <div key={index} style={{ display: "flex" }}>
            {word}
          </div>
        ) : (
          <div key={index} style={{ display: "flex" }}>
            {word}
            <div style={{ display: "flex", color: OG_COLORS.brand }}>.</div>
          </div>
        ),
      )}
    </div>
  );
}
