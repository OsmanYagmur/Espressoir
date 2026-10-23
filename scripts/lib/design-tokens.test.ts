import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readTokensCss, renderDesignTokens, TOKENS_TS } from "./design-tokens";

describe("design tokens", () => {
  it("the generated TypeScript copy matches design/tokens.css (run pnpm tokens:gen)", () => {
    expect(readFileSync(TOKENS_TS, "utf8")).toBe(renderDesignTokens(readTokensCss()));
  });
});
