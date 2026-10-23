/**
 * Regenerates apps/web/src/lib/design-tokens.ts from design/tokens.css.
 *   pnpm tokens:gen
 */
import { writeFileSync } from "node:fs";

import { readTokensCss, renderDesignTokens, TOKENS_TS } from "./lib/design-tokens";

writeFileSync(TOKENS_TS, renderDesignTokens(readTokensCss()));
console.log(`✓ ${TOKENS_TS}`);
