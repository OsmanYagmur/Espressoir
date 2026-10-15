/**
 * What the mobile app does: it signs in against Supabase Auth, writes straight to the
 * database, then asks the website to refresh its cached archive. Needs a real Supabase,
 * so it runs in CI against the local stack and is skipped in the offline run.
 */
import { expect, test, type APIRequestContext } from "@playwright/test";

import { apiHeaders, configured, guest, supabaseUrl as url } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");

/** A session the way the app gets one: the auth server, with a CAPTCHA token. */
async function accessToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: apiHeaders,
    data: {
      email: guest.email,
      password: guest.password,
      // Cloudflare's test token, which the local stack's test secret accepts.
      gotrue_meta_security: { captcha_token: "XXXX.DUMMY.TOKEN.XXXX" },
    },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { access_token: string }).access_token;
}

test("a tasting written by the app shows on the site once the app asks for a refresh", async ({
  page,
  request,
}) => {
  const token = await accessToken(request);
  const member = { ...apiHeaders, Authorization: `Bearer ${token}` };

  const coffees = await request.get(`${url}/rest/v1/coffee_overview?select=coffee_id&limit=1`, {
    headers: apiHeaders,
  });
  const [coffee] = (await coffees.json()) as { coffee_id: string }[];
  expect(coffee).toBeDefined();

  const note = `Uygulamadan yazıldı ${Date.now()}`;
  const logged = await request.post(`${url}/rest/v1/rpc/log_tasting_v2`, {
    headers: member,
    // No score: another spec may have made this account the brand's official one.
    data: { p_coffee_id: coffee!.coffee_id, p_notes: note, p_visibility: "public" },
  });
  expect(logged.ok()).toBe(true);
  const [row] = (await logged.json()) as { brand_slug: string; coffee_slug: string }[];

  const refreshed = await request.post("/api/arsiv-tazele", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(refreshed.status()).toBe(200);
  expect(await refreshed.json()).toEqual({ ok: true });

  // The archive is cached for hours; only the refresh brings the new tasting in now.
  await expect(async () => {
    await page.goto(`/kahve/${row!.brand_slug}/${row!.coffee_slug}`);
    await expect(page.getByText(note)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
});
