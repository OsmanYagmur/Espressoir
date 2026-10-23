/**
 * A workshop application, from the form to the admin panel: anyone applies, the seats left
 * go down at once, the same person cannot apply twice, and only the admin sees and answers
 * the application. Needs the local Supabase stack, like the other signed-in specs.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";

import { configured, owner, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
test.describe.configure({ mode: "serial" });

async function sessionOf(browser: Browser, account: typeof owner): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, account);
  return page;
}

/** "8 kişilik · 7 yer kaldı" → 7 (0 once it is full). */
async function seatsLeft(page: Page): Promise<number> {
  const text =
    (await page
      .getByText(/\d+ kişilik · /)
      .first()
      .textContent()) ?? "";
  return Number(/(\d+) yer kaldı/.exec(text)?.[1] ?? 0);
}

async function apply(page: Page, name: string, contact: string) {
  await page.getByLabel("Adın", { exact: true }).fill(name);
  await page.getByLabel("Sana nasıl ulaşalım?", { exact: true }).fill(contact);
  await page.getByText("Evde demliyorum", { exact: true }).click();
  await page.getByLabel("Merak ettiğin bir şey var mı? (isteğe bağlı)").fill("Uçtan uca soru.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /^(Başvur|Haber ver)$/ }).click();
}

test("a visitor applies; the admin sees, answers and removes the application", async ({
  page,
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const name = `E2E Başvuru ${stamp}`;
  const contact = `@e2e_${stamp}`;

  await page.goto("/atolye");
  const before = await seatsLeft(page);
  await apply(page, name, contact);
  await expect(page.getByText("Başvurun alındı. İki gün içinde sana yazacağım.")).toBeVisible();

  // The page counts one seat fewer straight away (it never shows who applied).
  await expect(async () => {
    await page.reload();
    expect(await seatsLeft(page)).toBe(Math.max(before - 1, 0));
  }).toPass({ timeout: 20_000 });
  await expect(page.getByText(name)).toHaveCount(0);

  // The same handle, written differently, is one person.
  await apply(page, `${name} tekrar`, contact.toUpperCase());
  await expect(
    page.getByText("Bu iletişim bilgisiyle bu atölyeye zaten başvurmuşsun."),
  ).toBeVisible();

  const admin = await sessionOf(browser, owner);
  await admin.goto("/panel/yonetim");
  const application = admin
    .getByRole("list", { name: "Başvurular" })
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(application).toContainText(contact);
  await expect(application).toContainText("Evde demliyorum");
  await expect(application).toContainText("Uçtan uca soru.");

  await application.getByRole("combobox").selectOption({ label: "Onaylandı" });
  await application.getByRole("button", { name: "Durumu kaydet" }).click();
  await expect(admin.getByText("İşlem tamamlandı.").filter({ visible: true })).toBeVisible();
  await expect(application).toContainText("Onaylandı");

  await application.getByRole("checkbox").check();
  await application.getByRole("button", { name: "Başvuruyu sil" }).click();
  await expect(admin.getByText("İşlem tamamlandı.").filter({ visible: true })).toBeVisible();
  await expect(application).toHaveCount(0);
  await admin.context().close();
});
