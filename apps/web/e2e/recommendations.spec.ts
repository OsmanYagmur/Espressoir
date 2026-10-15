/**
 * Suggestions: a coffee someone else loved, carrying the notes of the owner's favourite
 * tastings, shows up among the owner's suggestions with that reason. Needs the local
 * Supabase stack and the sample archive, like the other signed-in specs.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";

import { configured, guest, owner, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
test.describe.configure({ mode: "serial" });

const stamp = Date.now().toString(36);

/** Text that is on screen (a page left through a link stays in the document, hidden). */
const seen = (page: Page, text: string | RegExp, options?: { exact?: boolean }) =>
  page.getByText(text, options).filter({ visible: true });

async function sessionOf(browser: Browser, account: typeof owner): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, account);
  return page;
}

test("a coffee with the notes the owner likes is suggested to them, with the reason", async ({
  page,
  browser,
}) => {
  const name = `Öneri Harmanı ${stamp}`;
  const tag = (group: string, label: string) =>
    page.getByRole("group", { name: group, exact: true }).getByText(label, { exact: true });

  // The guest loves a coffee the owner has never had, and tags it as the owner's
  // favourite Ristretto is tagged in the sample archive.
  await signIn(page, guest);
  await page.goto("/panel/tadim/yeni");
  await seen(page, "Yeni kahve", { exact: true }).click();
  // An existing brand: members may add only a few new brands a day.
  await page.getByLabel("Marka", { exact: true }).fill("Nespresso");
  await page.getByLabel("Kahve adı", { exact: true }).fill(name);
  await page.getByRole("group", { name: "Puan" }).getByText("9", { exact: true }).click();
  await page.getByText("Ayrıntılar (isteğe bağlı)").click();
  await tag("Çikolata ve kakao", "Kakao").click();
  await tag("Çikolata ve kakao", "Bitter Çikolata").click();
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${name}.`);

  const mine = await sessionOf(browser, owner);
  await expect(mine.getByRole("link", { name: "Öneriler" })).toHaveAttribute(
    "href",
    "/panel/oneriler",
  );
  await mine.goto("/panel/oneriler");
  await expect(mine.getByRole("heading", { level: 1 })).toHaveText("Öneriler.");
  await expect(seen(mine, "Bu öneriler sitenin kendi modelinden.")).toBeVisible();
  const suggestion = mine
    .getByRole("list", { name: "Önerilen kahveler" })
    .getByRole("listitem")
    .filter({ hasText: name });
  // Which signal is strongest depends on what other specs left behind (the guest also
  // liked a coffee the owner liked, say); which one wins is the unit tests' business.
  await expect(suggestion).toContainText(
    /Sevdiğin notalar: .*Kakao|sevenlerden \d+ kişi bunu da beğendi|tat profiline yakın/,
  );
  await expect(suggestion.getByRole("img", { name: "10 üzerinden 9 puan" })).toBeVisible();
  // Nothing the owner has already had is suggested.
  await expect(
    mine.getByRole("list", { name: "Önerilen kahveler" }).getByText("Ristretto (Siyah Kapsül)"),
  ).toHaveCount(0);
  await mine.context().close();
});
