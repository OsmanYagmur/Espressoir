import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { repoRoot } from "./target-env";

const TOKENS_CSS = resolve(repoRoot, "design/tokens.css");
export const TOKENS_TS = resolve(repoRoot, "apps/web/src/lib/design-tokens.ts");

/** The `--name: #hex;` declarations of the first block that `selector` opens. */
function colorsOf(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`design/tokens.css has no "${selector}" block.`);
  const body = css.slice(start, css.indexOf("}", start));
  const colors: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{3,8});/gi)) {
    if (name && value) colors[name] = value.toLowerCase();
  }
  if (Object.keys(colors).length === 0) {
    throw new Error(`The "${selector}" block of design/tokens.css holds no colours.`);
  }
  return colors;
}

function objectLiteral(colors: Record<string, string>): string {
  return Object.entries(colors)
    .map(([name, value]) => `    ${JSON.stringify(name)}: ${JSON.stringify(value)},`)
    .join("\n");
}

/**
 * The colour tokens as a TypeScript module, for the few places that cannot read CSS
 * variables: the browser's theme colour, the web app manifest and the images drawn with
 * next/og. Dark lists only what the dark theme changes.
 */
export function renderDesignTokens(css: string): string {
  const light = colorsOf(css, ":root");
  const dark = colorsOf(css, ':root[data-theme="dark"]');
  return [
    "// Generated from design/tokens.css by `pnpm tokens:gen`. Do not edit: change the tokens,",
    "// then run the command again (a test fails while the two disagree).",
    "export const designTokens = {",
    "  light: {",
    objectLiteral(light),
    "  },",
    "  dark: {",
    objectLiteral(dark),
    "  },",
    "} as const;",
    "",
  ].join("\n");
}

export function readTokensCss(): string {
  return readFileSync(TOKENS_CSS, "utf8");
}
