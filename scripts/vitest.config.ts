import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
    // The database tests start an in-process Postgres and apply every migration before the
    // first assertion. That takes about a second on a laptop but can take many on a busy
    // CI runner, where Vitest's defaults (5 s per test, 10 s per hook) are too tight.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
