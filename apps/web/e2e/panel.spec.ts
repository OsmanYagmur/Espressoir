/**
 * The signed-in area: logging in, adding, editing and deleting a tasting, and not being
 * able to touch someone else's. These need a real Supabase (auth + database), so they run
 * in CI against the local stack and are skipped in the offline run.
 *
 * Accounts come from the environment (created by `pnpm admin:bootstrap` and
 * `scripts/e2e-setup.ts`); nothing is hard-coded here.
 */
import { expect, test } from "@playwright/test";

import {
  apiHeaders,
  configured,
  guest,
  owner,
  signIn,
  submitPassword,
  supabaseUrl as url,
} from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

test("registration is closed: the auth server refuses new accounts", async ({ request }) => {
  const response = await request.post(`${url}/auth/v1/signup`, {
    headers: apiHeaders,
    data: {
      email: "intruder@example.test",
      password: "a-long-enough-password",
      // Cloudflare's test token, which the stack's test secret accepts: the refusal below
      // is about signup being closed, not about a missing CAPTCHA.
      gotrue_meta_security: { captcha_token: "XXXX.DUMMY.TOKEN.XXXX" },
    },
  });
  expect(response.ok()).toBe(false);
  expect(JSON.stringify(await response.json())).toMatch(/signup/i);
});

test("a wrong password is refused without saying which part was wrong", async ({ page }) => {
  await submitPassword(page, { email: owner.email, password: "definitely-not-the-password" });
  await expect(page.getByText("E-posta ya da parola hatalı.")).toBeVisible();
  await expect(page).toHaveURL(/\/giris$/);
});

test("the owner can add, edit and delete a tasting", async ({ page }, testInfo) => {
  // Unique per project (mobile/desktop) and run, so reruns never collide.
  const coffeeName = `Deneme ${testInfo.project.name} ${Date.now()}`;
  const slug = coffeeName.toLowerCase().replaceAll(" ", "-");

  await signIn(page, owner);
  await expect(page.getByText(/olarak giriş yapıldı/)).toBeVisible();

  // Add: a new coffee under a new brand, scored 7, brewed with a V60.
  await page.getByRole("link", { name: "Tadım ekle" }).click();
  await page.getByText("Yeni kahve", { exact: true }).click();
  await page.getByLabel("Marka", { exact: true }).fill("E2E Kavurucu");
  await page.getByLabel("Kahve adı", { exact: true }).fill(coffeeName);
  await page.getByLabel("Form", { exact: true }).selectOption({ label: "Çekirdek" });
  await page.getByRole("group", { name: "Puan" }).getByText("7", { exact: true }).click();
  await page.getByLabel("Demleme yöntemi", { exact: true }).selectOption({ label: "V60" });
  await page.getByLabel("Not", { exact: true }).fill("Uçtan uca test notu.\nİkinci satır.");
  await page.getByRole("button", { name: "Kaydet" }).click();

  // Saved: we land on the coffee's public page, which already shows the tasting.
  await expect(page).toHaveURL(new RegExp(`/kahve/e2e-kavurucu/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${coffeeName}.`);
  await expect(page.getByRole("list", { name: "Tadımlar" })).toContainText("Uçtan uca test notu.");
  await expect(page.getByRole("img", { name: "10 üzerinden 7 puan" }).first()).toBeVisible();

  // …and so does the public list, without waiting for the hourly refresh.
  await page.goto(`/kahveler?q=${encodeURIComponent(coffeeName)}`);
  await expect(page.getByRole("list", { name: "Kahveler" }).getByRole("listitem")).toHaveCount(1);

  // Edit: raise the score to 9.
  await page.goto("/panel");
  const row = page.getByRole("listitem").filter({ hasText: coffeeName });
  await row.getByRole("link", { name: "Düzenle" }).click();
  await expect(page.getByLabel("Not", { exact: true })).toHaveValue(
    "Uçtan uca test notu.\nİkinci satır.",
  );
  await page.getByRole("group", { name: "Puan" }).getByText("9", { exact: true }).click();
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(row.getByRole("img", { name: "10 üzerinden 9 puan" })).toBeVisible();

  // Delete.
  await row.getByRole("link", { name: "Düzenle" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Tadımı sil" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("listitem").filter({ hasText: coffeeName })).toHaveCount(0);
});

test("the form explains what is wrong instead of losing what was typed", async ({ page }) => {
  await signIn(page, owner);
  await page.goto("/panel/tadim/yeni");
  await page.getByText("Yeni kahve", { exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill("Kahvesi seçilmemiş bir not.");
  await page.getByRole("button", { name: "Kaydet" }).click();

  await expect(page.getByText("Formda eksik ya da hatalı alanlar var.")).toBeVisible();
  await expect(page.getByLabel("Not", { exact: true })).toHaveValue("Kahvesi seçilmemiş bir not.");
});

test("another user cannot open the owner's tasting for editing", async ({ page, request }) => {
  // Any public tasting of the owner will do; its id is public information.
  const response = await request.get(`${url}/rest/v1/tasting_feed?select=tasting_id&limit=1`, {
    headers: apiHeaders,
  });
  const rows = (await response.json()) as { tasting_id: string }[];
  const tastingId = rows[0]?.tasting_id;
  expect(tastingId).toBeTruthy();

  await signIn(page, guest);
  await page.goto(`/panel/tadim/${tastingId}`);
  await expect(page.getByText("Bu tadım bulunamadı ya da sana ait değil.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kaydet" })).toHaveCount(0);
});

test("signing out ends the session", async ({ page }) => {
  await signIn(page, owner);
  // The header knows about the session without asking the server.
  await expect(page.getByRole("banner").getByRole("link", { name: "Panel" })).toBeVisible();

  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("banner").getByRole("link", { name: "Giriş" })).toBeVisible();
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/giris$/);
});
