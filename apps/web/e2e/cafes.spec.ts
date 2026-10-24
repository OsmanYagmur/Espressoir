/**
 * Cafés: a member adds a café with what they drank there, is warned before adding the
 * same café twice, edits and deletes a visit; an admin reviews the café. Needs the local
 * Supabase stack, like the other signed-in specs.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";

import { configured, guest, owner, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);
const name = `Deneme Kafesi ${stamp}`;
const cafeUrl = new RegExp(`/kafe/ankara/deneme-kafesi-${stamp}$`);
const label = `${name} — Çankaya, Ankara`;

/** Text that is on screen (a page left through a link stays in the document, hidden). */
const seen = (page: Page, text: string | RegExp, options?: { exact?: boolean }) =>
  page.getByText(text, options).filter({ visible: true });

async function chooseDrink(page: Page, drink: string, score: number) {
  await page.getByRole("group", { name: "İçecek türü" }).getByText(drink, { exact: true }).click();
  await page.getByRole("group", { name: "Puan" }).getByText(String(score), { exact: true }).click();
}

async function sessionOf(browser: Browser, account: typeof owner): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, account);
  return page;
}

test("a member adds a visit at a new café, then another one there", async ({ page }) => {
  await signIn(page, guest);
  await page.getByRole("link", { name: "Kafe ziyareti ekle" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kafe ziyareti ekle");

  await seen(page, "Yeni kafe", { exact: true }).click();
  await page.getByLabel("Kafenin adı", { exact: true }).fill(name);
  await page.getByLabel("Şehir", { exact: true }).selectOption({ label: "Ankara" });
  await page.getByLabel("Semt", { exact: true }).fill("Çankaya");
  // An address that is not on a map service is refused; the form keeps what was typed.
  await page.getByLabel("Harita bağlantısı", { exact: true }).fill("https://example.com/kafe");
  await chooseDrink(page, "Flat white", 8);
  await page.getByLabel("Not", { exact: true }).fill("Uçtan uca kafe notu.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(seen(page, /harita bağlantısı gibi görünmüyor/)).toBeVisible();
  await expect(page.getByLabel("Kafenin adı", { exact: true })).toHaveValue(name);
  await expect(page.getByLabel("Not", { exact: true })).toHaveValue("Uçtan uca kafe notu.");
  // Every choice survives the error: the mode, the city, the drink and the score.
  await expect(page.getByRole("radio", { name: "Yeni kafe" })).toBeChecked();
  await expect(page.getByLabel("Şehir", { exact: true })).toHaveValue("6");
  await expect(page.getByRole("radio", { name: "Flat white" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "8", exact: true })).toBeChecked();

  await page
    .getByLabel("Harita bağlantısı", { exact: true })
    .fill("https://maps.app.goo.gl/e2eKafe");
  await page.getByRole("button", { name: "Kaydet" }).click();

  // Saved: the café's page, new and marked as not reviewed, already shows the visit.
  await expect(page).toHaveURL(cafeUrl);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByRole("note")).toContainText("Doğrulanmadı");
  await expect(page.getByRole("link", { name: /Haritada aç/ })).toHaveAttribute(
    "href",
    "https://maps.app.goo.gl/e2eKafe",
  );
  const visits = page.getByRole("list", { name: "Ziyaretler" }).getByRole("listitem");
  await expect(visits).toHaveCount(1);
  await expect(visits.first()).toContainText("Uçtan uca kafe notu.");

  // From the café's page the form starts with the café chosen.
  await page.getByRole("link", { name: "Burada ne içtin?" }).click();
  await expect(page).toHaveURL(/\/panel\/kafe\/yeni\/[0-9a-f-]{36}$/);
  await expect(seen(page, label, { exact: true })).toBeVisible();
  await chooseDrink(page, "Espresso", 6);
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(cafeUrl);
  await expect(visits).toHaveCount(2);
  await expect(page.getByRole("img", { name: "Puan: 7 / 10" }).first()).toBeVisible();

  // Listed among the cafés at once.
  await page.goto(`/kafeler?q=${encodeURIComponent(stamp)}`);
  await expect(page.getByRole("list", { name: "Kafeler" }).getByRole("listitem")).toHaveCount(1);
});

test("typing a café that is already there offers it instead", async ({ page }) => {
  await signIn(page, guest);
  await page.goto("/panel/kafe/yeni");
  await seen(page, "Yeni kafe", { exact: true }).click();
  // Another spelling of the same name, in the same city.
  await page.getByLabel("Kafenin adı", { exact: true }).fill(`DENEME kafesi ${stamp}`);
  await page.getByLabel("Şehir", { exact: true }).selectOption({ label: "Ankara" });
  const warning = page.getByRole("status").filter({ hasText: "zaten kayıtlı olabilir" });
  await expect(warning).toContainText(label);
  await warning.getByRole("button", { name: "Bunu seç" }).click();
  await expect(seen(page, "Seçilen kafe", { exact: true })).toBeVisible();
  await expect(seen(page, label, { exact: true })).toBeVisible();
});

test("a member edits and deletes their visit from the panel", async ({ page }) => {
  await signIn(page, guest);
  const mine = page.getByRole("list", { name: "Kafe ziyaretlerin" });
  const row = mine.getByRole("listitem").filter({ hasText: name }).filter({ hasText: "Espresso" });
  await expect(row).toHaveCount(1);

  await row.getByRole("link", { name: "Düzenle" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kafe ziyaretini düzenle");
  await page.getByRole("group", { name: "Puan" }).getByText("9", { exact: true }).click();
  await page.getByLabel("Menüdeki adı", { exact: true }).fill("Tek shot");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(row.getByRole("img", { name: "Puan: 9 / 10" })).toBeVisible();
  await expect(row).toContainText("Espresso · Tek shot");

  await row.getByRole("link", { name: "Düzenle" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Ziyareti sil" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(mine.getByRole("listitem").filter({ hasText: name })).toHaveCount(1);
});

test("the admin reviews the café", async ({ browser }) => {
  const admin = await sessionOf(browser, owner);
  await admin.goto("/osman/yonetim");
  const pending = admin.getByRole("list", { name: "Doğrulanmamış kafeler" });
  // A café's row is the one that links to it: its name is also a choice in other rows.
  const row = pending.getByRole("listitem").filter({ has: admin.getByRole("link", { name }) });
  await expect(row).toContainText("1 ziyaret");
  await row.getByRole("button", { name: "Doğrula" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await expect(row).toHaveCount(0);

  await admin.goto(`/kafeler?q=${encodeURIComponent(stamp)}`);
  await admin.getByRole("link", { name }).click();
  await expect(admin).toHaveURL(cafeUrl);
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(admin.getByRole("note")).toHaveCount(0);
  await admin.context().close();
});
