/**
 * Talking under a tasting, and keeping it civil: comments, replies and likes; a report
 * that reaches the admin; hiding; restricting a member; reviewing and merging coffees
 * members added. Needs the local Supabase stack, like the other signed-in specs.
 */
import {
  expect,
  request as playwrightRequest,
  test,
  type Browser,
  type Page,
} from "@playwright/test";

import { configured, guest, owner, signIn, supabaseUrl } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

const ownerUsername = process.env.OWNER_USERNAME ?? "owner";
const RISTRETTO = "/kahve/nespresso/ristretto-siyah-kapsul";
const stamp = Date.now().toString(36);

/** A second signed-in browser, for the other side of a conversation. */
async function sessionOf(browser: Browser, account: typeof guest): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, account);
  return page;
}

/**
 * Text that is actually on screen. A page left through a link stays in the document,
 * hidden (the router keeps it for going back), and a plain text query would find it too.
 */
const seen = (page: Page, text: string | RegExp, options?: { exact?: boolean }) =>
  page.getByText(text, options).filter({ visible: true });

/** The page of the owner's tasting of the Ristretto, found the way a reader would find it. */
async function openOwnersTasting(page: Page): Promise<string> {
  await page.goto(RISTRETTO);
  const href = await page
    .getByRole("list", { name: "Tadımlar" })
    .getByRole("listitem")
    .filter({ hasText: `@${ownerUsername}` })
    .getByRole("link", { name: /beğeni · \d+ yorum/ })
    .getAttribute("href");
  expect(href).toMatch(/^\/tadim\/[0-9a-f-]{36}$/);
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: /Yorumlar/ })).toBeVisible();
  return page.url();
}

async function writeComment(page: Page, text: string) {
  await page.getByLabel("Yorumun", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Gönder", exact: true }).click();
  await expect(page.getByRole("list", { name: "Yorumlar" }).getByText(text)).toBeVisible();
}

const comments = (page: Page) => page.getByRole("list", { name: "Yorumlar" });

// Whatever happens above, the guest account must not stay restricted for other specs.
test.afterAll(async () => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || !supabaseUrl) return;
  const api = await playwrightRequest.newContext();
  await api.delete(`${supabaseUrl}/rest/v1/profile_private?restricted_until=not.is.null`, {
    headers: { apikey: secret, Authorization: `Bearer ${secret}` },
  });
  await api.dispose();
});

test("members like a tasting and talk under it, one level deep", async ({ page, browser }) => {
  await signIn(page, guest);
  const url = await openOwnersTasting(page);

  // A like shows at once and is counted.
  await page.getByRole("button", { name: "Beğen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Beğendin" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(seen(page, "1 beğeni")).toBeVisible();

  const first = `Misafirin yorumu ${stamp}`;
  await writeComment(page, first);
  const mine = comments(page).getByRole("listitem").filter({ hasText: first });
  await expect(mine.getByRole("link", { name: "@e2e_guest" })).toBeVisible();

  // Editing marks the comment as edited.
  await mine.getByRole("button", { name: "Düzenle" }).click();
  await mine.getByLabel("Yorumun", { exact: true }).fill(`${first} (düzeltildi)`);
  await mine.getByRole("button", { name: "Kaydet" }).click();
  await expect(comments(page).getByText(`${first} (düzeltildi)`)).toBeVisible();
  await expect(mine.getByText("düzenlendi")).toBeVisible();

  // The author of the tasting answers; they cannot like their own tasting.
  const other = await sessionOf(browser, owner);
  await other.goto(url);
  await expect(seen(other, "1 beğeni")).toBeVisible();
  await expect(other.getByRole("button", { name: "Beğen", exact: true })).toHaveCount(0);
  const theirs = comments(other).getByRole("listitem").filter({ hasText: first }).first();
  await theirs.getByRole("button", { name: "Yanıtla" }).click();
  await theirs.getByLabel("Yanıtın", { exact: true }).fill(`Sahibinin yanıtı ${stamp}`);
  await theirs.getByRole("button", { name: "Gönder", exact: true }).click();
  await expect(theirs.getByText(`Sahibinin yanıtı ${stamp}`)).toBeVisible();
  // A reply cannot be replied to.
  await expect(theirs.getByRole("listitem").getByRole("button", { name: "Yanıtla" })).toHaveCount(
    0,
  );
  await other.context().close();

  // Removing an answered comment leaves a placeholder, so the reply keeps its place.
  await page.reload();
  const thread = comments(page)
    .getByRole("listitem")
    .filter({ hasText: `Sahibinin yanıtı ${stamp}` })
    .first();
  page.once("dialog", (dialog) => dialog.accept());
  await thread.getByRole("button", { name: "Sil" }).first().click();
  await expect(thread.getByText("Bu yorum silindi.")).toBeVisible();
  await expect(thread.getByText(`Sahibinin yanıtı ${stamp}`)).toBeVisible();
  await expect(seen(page, `${first} (düzeltildi)`)).toHaveCount(0);

  // Taking the like back.
  await page.getByRole("button", { name: "Beğendin" }).click();
  await expect(seen(page, "0 beğeni")).toBeVisible();
});

test("a reported comment reaches the admin, who hides it from everyone else", async ({
  page,
  browser,
}) => {
  const text = `Şikâyet edilecek yorum ${stamp}`;
  await signIn(page, guest);
  const url = await openOwnersTasting(page);
  await writeComment(page, text);

  // Another member reports it.
  const admin = await sessionOf(browser, owner);
  await admin.goto(url);
  const reported = comments(admin).getByRole("listitem").filter({ hasText: text }).first();
  await reported.getByRole("button", { name: "Şikâyet et" }).click();
  await reported.getByLabel("Hakaret, taciz ya da nefret söylemi").check();
  await reported.getByLabel("Açıklama (isteğe bağlı)").fill("E2E: kurallara aykırı.");
  await reported.getByRole("button", { name: "Şikâyeti gönder" }).click();
  await expect(reported.getByText("Şikâyetin alındı.")).toBeVisible();

  // It is in the admin's queue, with what was said about it: panel → /osman → Moderasyon.
  await admin.goto("/panel");
  await admin.getByRole("link", { name: "Yönetim" }).click();
  await expect(admin).toHaveURL(/\/osman$/);
  await admin
    .getByRole("navigation", { name: "Yönetim bölümleri" })
    .getByRole("link", { name: "Moderasyon" })
    .click();
  await expect(admin).toHaveURL(/\/osman\/yonetim$/);
  const report = admin
    .getByRole("list", { name: "Açık şikâyetler" })
    .getByRole("listitem")
    .filter({ hasText: text });
  await expect(report).toContainText("E2E: kurallara aykırı.");
  await expect(report).toContainText("@e2e_guest");

  await report.getByLabel("Neden").first().fill("Kurallara aykırı");
  await report.getByRole("button", { name: "Gizle" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await admin
    .getByRole("list", { name: "Açık şikâyetler" })
    .getByRole("listitem")
    .filter({ hasText: text })
    .getByRole("button", { name: "Çözüldü" })
    .click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await expect(admin.getByRole("list", { name: "Açık şikâyetler" }).getByText(text)).toHaveCount(0);
  await expect(admin.getByRole("list", { name: "Gizlenen içerik" })).toContainText(text);
  await expect(admin.getByRole("list", { name: "Son işlemler" })).toContainText("gizledi");

  // Its author still sees it, marked; a visitor does not see it at all.
  await page.reload();
  const hidden = comments(page).getByRole("listitem").filter({ hasText: text }).first();
  await expect(hidden.getByText("Gizlendi", { exact: true })).toBeVisible();
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(url);
  await expect(visitor.getByRole("heading", { name: /Yorumlar/ })).toBeVisible();
  await expect(seen(visitor, "Yorumlar yükleniyor…")).toHaveCount(0);
  await expect(seen(visitor, text)).toHaveCount(0);
  await visitor.context().close();
  await admin.context().close();
});

test("a restricted member is told so and cannot post until it is lifted", async ({
  page,
  browser,
}) => {
  const admin = await sessionOf(browser, owner);
  await admin.goto("/osman/yonetim");
  const form = admin.locator("form").filter({ has: admin.getByLabel("Kullanıcı adı") });
  await form.getByLabel("Kullanıcı adı").fill("e2e_guest");
  await form.getByLabel("Süre").selectOption({ label: "1 gün" });
  await form.getByLabel("Neden").fill("E2E testi");
  await form.getByRole("button", { name: "Kısıtla" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  const restricted = admin
    .getByRole("list", { name: "Kısıtlı üyeler" })
    .getByRole("listitem")
    .filter({ hasText: "@e2e_guest" });
  await expect(restricted).toContainText("E2E testi");

  await signIn(page, guest);
  await expect(page.getByRole("alert").filter({ hasText: "kısıtlı" })).toContainText("E2E testi");
  await openOwnersTasting(page);
  await page.getByLabel("Yorumun", { exact: true }).fill(`Kısıtlıyken ${stamp}`);
  await page.getByRole("button", { name: "Gönder", exact: true }).click();
  await expect(seen(page, /Hesabın şu an yazamıyor/)).toBeVisible();
  // What they typed is still in the box.
  await expect(page.getByLabel("Yorumun", { exact: true })).toHaveValue(`Kısıtlıyken ${stamp}`);

  await restricted.getByRole("button", { name: "Kısıtlamayı kaldır" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await expect(seen(admin, "Kısıtlı üye yok.")).toBeVisible();
  await admin.context().close();

  await page.getByRole("button", { name: "Gönder", exact: true }).click();
  await expect(comments(page).getByText(`Kısıtlıyken ${stamp}`)).toBeVisible();
});

test("the admin reviews a member's coffee and merges a duplicate into the original", async ({
  page,
  browser,
}) => {
  const fresh = `İnceleme Harmanı ${stamp}`;
  const duplicate = `Ristretto Kopya ${stamp}`;
  const note = `Birleştirilecek not ${stamp}`;

  async function addCoffee(name: string, notes: string) {
    await page.goto("/panel/tadim/yeni");
    await seen(page, "Yeni kahve", { exact: true }).click();
    await page.getByLabel("Marka", { exact: true }).fill("Nespresso");
    await page.getByLabel("Kahve adı", { exact: true }).fill(name);
    await page.getByRole("group", { name: "Puan" }).getByText("5", { exact: true }).click();
    await page.getByLabel("Not", { exact: true }).fill(notes);
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    return page.url();
  }

  await signIn(page, guest);
  const freshUrl = await addCoffee(fresh, "Yeni bir kahve.");
  await expect(page.getByRole("note")).toContainText("Doğrulanmadı");
  const duplicateUrl = await addCoffee(duplicate, note);

  const admin = await sessionOf(browser, owner);
  await admin.goto("/osman/yonetim");
  const pending = admin.getByRole("list", { name: "Doğrulanmamış kahveler" });
  // A coffee's row is the one that links to it: its name also shows up in every other
  // row, as a choice in the "merge into" list.
  const rowOf = (name: string) =>
    pending.getByRole("listitem").filter({ has: admin.getByRole("link", { name }) });

  // Reviewed: off the list, and the mark is gone from its page.
  await rowOf(fresh).getByRole("button", { name: "Doğrula" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await expect(rowOf(fresh)).toHaveCount(0);
  await admin.goto(freshUrl);
  await expect(admin.getByRole("heading", { level: 1 })).toHaveText(fresh);
  await expect(admin.getByRole("note")).toHaveCount(0);

  // Merged: the duplicate is gone and its tasting now belongs to the original.
  await admin.goto("/osman/yonetim");
  await rowOf(duplicate)
    .getByLabel("Şununla birleştir")
    .selectOption({ label: "Nespresso — Ristretto (Siyah Kapsül)" });
  await rowOf(duplicate).getByRole("checkbox").check();
  await rowOf(duplicate).getByRole("button", { name: "Birleştir" }).click();
  await expect(seen(admin, "İşlem tamamlandı.")).toBeVisible();
  await expect(rowOf(duplicate)).toHaveCount(0);

  await admin.goto(RISTRETTO);
  await expect(admin.getByRole("list", { name: "Tadımlar" })).toContainText(note);
  const gone = await admin.goto(duplicateUrl);
  expect(gone?.status()).toBe(404);
  await admin.context().close();
});
