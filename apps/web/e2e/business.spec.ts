/**
 * Verified business accounts: a member applies to speak for a brand, the admin approves,
 * the member hears it, edits the brand's page, carries the badge, and cannot score the
 * brand's own coffees; the admin takes the account back at the end. Needs the local
 * Supabase stack and the sample archive, like the other signed-in specs.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";

import { configured, guest, owner, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
test.describe.configure({ mode: "serial" });

// A brand no other signed-in spec scores as the guest: becoming its official account must
// not stop them from scoring elsewhere.
const BRAND = "/marka/kronotrop";
const stamp = Date.now().toString(36);

const seen = (page: Page, text: string | RegExp, options?: { exact?: boolean }) =>
  page.getByText(text, options).filter({ visible: true });

async function sessionOf(browser: Browser, account: typeof owner): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, account);
  return page;
}

test("a member applies for a brand, is approved, edits its page and wears the badge", async ({
  page,
  browser,
}) => {
  const about = `E2E tanıtım ${stamp}: küçük partiler.`;

  // The application, from the brand's own page.
  await signIn(page, guest);
  await page.goto(BRAND);
  await page.getByRole("link", { name: /Bu işletme senin mi\?/ }).click();
  await expect(page).toHaveURL(/\/panel\/isletme\/basvuru\/marka\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Doğrulama başvurusu");
  await page
    .getByLabel("Açıklama", { exact: true })
    .fill(`E2E ${stamp}: kavurucunun temsilcisiyim.`);
  await page.getByLabel("İşletmenin web sitesi", { exact: true }).fill("http://kronotrop.example");
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(seen(page, /https:\/\/ ile başlayan bir adres/)).toBeVisible();
  await page.getByLabel("İşletmenin web sitesi", { exact: true }).fill("https://kronotrop.example");
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page).toHaveURL(/\/panel\/isletme$/);
  const applications = page.getByRole("list", { name: "Başvuruların" });
  await expect(applications.getByRole("listitem").first()).toContainText("Kronotrop");
  await expect(applications.getByRole("listitem").first()).toContainText("Bekliyor");

  // The admin approves it.
  const admin = await sessionOf(browser, owner);
  await admin.goto("/panel/yonetim");
  const request = admin
    .getByRole("list", { name: "Doğrulama başvuruları" })
    .getByRole("listitem")
    .filter({ hasText: stamp });
  await expect(request).toContainText("@e2e_guest");
  await request.getByRole("button", { name: "Onayla" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();

  // The member hears it, and finds the brand among their businesses.
  await page.goto("/bildirimler");
  await expect(seen(page, "Kronotrop için doğrulama başvurun onaylandı.")).toBeVisible();
  await page.goto("/panel/isletme");
  const mine = page.getByRole("list", { name: "Resmi hesabı olduğun işletmeler" });
  await expect(mine).toContainText("Kronotrop");
  await mine.getByLabel("Tanıtım", { exact: true }).fill(about);
  await mine.getByLabel("Web sitesi", { exact: true }).fill("https://kronotrop.example");
  await mine.getByRole("button", { name: "Kaydet" }).click();
  await expect(seen(page, "Kaydedildi.")).toBeVisible();

  // The brand's page says it, with who speaks for it; so does the member's page.
  await page.goto(BRAND);
  await expect(seen(page, about)).toBeVisible();
  await expect(page.getByRole("link", { name: "@e2e_guest" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Web sitesi/ })).toHaveAttribute(
    "href",
    "https://kronotrop.example",
  );
  await page.goto("/u/e2e_guest");
  await expect(page.getByRole("link", { name: "Kronotrop", exact: true })).toHaveAttribute(
    "href",
    BRAND,
  );

  // The brand's own coffees cannot be scored by its official account.
  await page.goto("/panel/tadim/yeni");
  await page.getByLabel("Kahve ara", { exact: true }).fill("kronotrop");
  await page.getByRole("list", { name: "Bulunan kahveler" }).getByRole("button").first().click();
  await page.getByRole("group", { name: "Puan" }).getByText("9", { exact: true }).click();
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(seen(page, /kendi kahvene puan veremezsin/)).toBeVisible();

  // The admin takes the account back; the brand's page invites applications again.
  await admin.goto("/panel/yonetim");
  const official = admin
    .getByRole("list", { name: "Resmi hesaplar" })
    .getByRole("listitem")
    .filter({ hasText: "Kronotrop" });
  await official.getByRole("checkbox").check();
  await official.getByRole("button", { name: "Kaldır" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await admin.goto(BRAND);
  await expect(admin.getByRole("link", { name: /Bu işletme senin mi\?/ })).toBeVisible();
  await admin.context().close();
});
