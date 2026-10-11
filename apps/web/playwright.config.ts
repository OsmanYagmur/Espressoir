import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// Lets environments with a preinstalled Chromium (e.g. sandboxes) skip `playwright install`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
// Specs that sign in and write to the database.
const SIGNED_IN = /(panel|account|community)\.spec/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "tr-TR",
    trace: "on-first-retry",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: SIGNED_IN },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: SIGNED_IN },
    // The signed-in tests add data, which the public tests' exact counts would trip over,
    // so they run once (on a phone, where tastings are mostly entered) after the others.
    {
      name: "signed-in",
      use: { ...devices["Pixel 7"] },
      testMatch: SIGNED_IN,
      dependencies: ["mobile", "desktop"],
    },
  ],
  // Runs against a production build (`pnpm build` first), the same output Vercel serves.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
