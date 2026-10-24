/**
 * A workshop application, from the form to the admin panel: anyone applies, the seats left
 * go down at once, the same person cannot apply twice, and only the admin sees and answers
 * the application. Needs the local Supabase stack, like the other signed-in specs.
 */
import { readFile } from "node:fs/promises";

import { expect, test, type Browser, type Page } from "@playwright/test";

import { configured, owner, press, signIn } from "./helpers";

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
  await page.getByLabel("Adın soyadın", { exact: true }).fill(name);
  await page.getByLabel("Telefon numaran", { exact: true }).fill(contact);
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
  // A number of its own on every run: the form takes phone numbers only.
  const digits = String(Date.now()).slice(-7);
  const contact = `0555 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;

  await page.goto("/workshop");
  const before = await seatsLeft(page);
  await apply(page, name, contact);
  await expect(page.getByText("Başvurun alındı. İki gün içinde sana yazacağım.")).toBeVisible();

  // The page counts one seat fewer straight away (it never shows who applied).
  await expect(async () => {
    await page.reload();
    expect(await seatsLeft(page)).toBe(Math.max(before - 1, 0));
  }).toPass({ timeout: 20_000 });
  await expect(page.getByText(name)).toHaveCount(0);

  // The same number, written differently, is one person.
  await apply(page, `${name} tekrar`, `+90 555 ${digits}`);
  await expect(
    page.getByText("Bu telefon numarasıyla bu atölyeye zaten başvurmuşsun."),
  ).toBeVisible();

  const admin = await sessionOf(browser, owner);
  await admin.goto("/osman/atolyeler");
  const application = admin
    .getByRole("list", { name: "Başvurular" })
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(application).toContainText(contact);
  await expect(application).toContainText("Evde demliyorum");
  await expect(application).toContainText("Uçtan uca soru.");

  await application.getByRole("combobox", { name: /^Durum:/ }).selectOption({ label: "Onaylandı" });
  await application.getByRole("combobox", { name: /^Katılım:/ }).selectOption({ label: "Geldi" });
  await application.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(admin.getByText("İşlem tamamlandı.").filter({ visible: true })).toBeVisible();
  await expect(application).toContainText("Onaylandı");
  await expect(application.getByRole("combobox", { name: /^Katılım:/ })).toHaveValue("true");

  await application.getByRole("checkbox").check();
  await application.getByRole("button", { name: "Başvuruyu sil" }).click();
  await expect(admin.getByText("İşlem tamamlandı.").filter({ visible: true })).toBeVisible();
  await expect(application).toHaveCount(0);
  await admin.context().close();
});

test("/osman asks for the password; the admin adds a person and downloads the list", async ({
  page,
}) => {
  const stamp = Date.now().toString(36);
  const name = `E2E Panel ${stamp}`;

  await page.goto("/osman");
  const tabs = page.getByRole("navigation", { name: "Yönetim bölümleri" });
  await expect(tabs).toHaveCount(0);
  await page.getByLabel("E-posta", { exact: true }).fill(owner.email ?? "");
  await page.getByLabel("Parola", { exact: true }).fill(owner.password ?? "");
  await press(page, "Giriş yap");
  await expect(tabs).toBeVisible();
  await expect(page).toHaveURL(/\/osman$/);
  await expect(page.getByRole("heading", { name: "Topluluk" })).toBeVisible();
  // CI has no Google Analytics: the overview says what is missing.
  await expect(page.getByText(/Google Analytics henüz bağlı değil/)).toBeVisible();

  await tabs.getByRole("link", { name: "Atölyeler" }).click();
  await expect(page).toHaveURL(/\/osman\/atolyeler$/);
  const workshop = page.getByRole("article").first();
  await workshop.getByText("Kişi ekle", { exact: true }).click();
  await workshop.getByLabel("Ad", { exact: true }).fill(name);
  await workshop.getByLabel("İletişim", { exact: true }).fill(`@panel_${stamp}`);
  await workshop.getByRole("checkbox", { name: /onay verdi/ }).check();
  await workshop.getByRole("button", { name: "Ekle", exact: true }).click();
  await expect(page.getByText("İşlem tamamlandı.").filter({ visible: true })).toBeVisible();

  const person = page
    .getByRole("list", { name: "Başvurular" })
    .getByRole("listitem")
    .filter({ hasText: name });
  await expect(person).toContainText("Panelden eklendi");
  await expect(person).toContainText("Onaylandı");

  // The list as a file; the handle starts with "@", so the cell gets an apostrophe.
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Başvuruları indir (CSV)" }).first().click();
  const csv = await readFile(await (await download).path(), "utf8");
  expect(csv).toContain(`${name};'@panel_${stamp};Yeni başlıyorum;;Onaylandı;;Panel;`);

  await person.getByRole("checkbox").check();
  await person.getByRole("button", { name: "Başvuruyu sil" }).click();
  await expect(person).toHaveCount(0);
});
