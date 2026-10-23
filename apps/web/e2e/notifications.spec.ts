/**
 * Notifications: a like, a comment, a reply and a new follower reach the member they
 * concern, the header counts what has not been seen, and opening the list marks it as
 * read. Needs the local Supabase stack, like the other signed-in specs.
 */
import { expect, test, type Page } from "@playwright/test";

import { configured, guest, owner, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

const ownerUsername = process.env.OWNER_USERNAME ?? "owner";
/** The member's menu in the header: its name counts what has not been seen. */
const bell = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: /^Hesap menüsü/ });
const inbox = (page: Page) => page.getByRole("list", { name: "Bildirimlerin" });

test("what others do with a member's tasting reaches that member, once", async ({
  page,
  browser,
}) => {
  // Two people sign in and go back and forth: more than the usual half minute.
  test.setTimeout(120_000);
  const stamp = Date.now().toString(36);
  const note = `Bildirim tadımı ${stamp}`;
  const comment = `Sahibinden yorum ${stamp}`;
  const reply = `Misafirden yanıt ${stamp}`;

  // The guest logs a tasting; whatever was waiting for them from earlier tests is read.
  await signIn(page, guest);
  await page.goto("/bildirimler");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bildirimler");
  // (Opening the list marks it as read in the background; look again until that is done.)
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bildirimler");
    await expect(page.getByText("Yeni", { exact: true })).toHaveCount(0, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.goto("/panel/tadim/yeni");
  await page.getByLabel("Kahve ara", { exact: true }).fill("nespresso colombia");
  await page
    .getByRole("list", { name: "Bulunan kahveler" })
    .getByText("Nespresso — Colombia")
    .click();
  await page.getByRole("group", { name: "Puan" }).getByText("7", { exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill(note);
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/\/kahve\/nespresso\/colombia$/);
  const tastingPath = await page
    .getByRole("list", { name: "Tadımlar" })
    .getByRole("listitem")
    .filter({ hasText: note })
    .getByRole("link", { name: /beğeni · \d+ yorum/ })
    .getAttribute("href");
  expect(tastingPath).toMatch(/^\/tadim\/[0-9a-f-]{36}$/);

  // The owner likes it and comments under it.
  const other = await (await browser.newContext()).newPage();
  await signIn(other, owner);
  await other.goto(tastingPath!);
  await other.getByRole("button", { name: "Beğen", exact: true }).click();
  await expect(other.getByRole("button", { name: "Beğendin" })).toBeVisible();
  await other.getByLabel("Yorumun", { exact: true }).fill(comment);
  await other.getByRole("button", { name: "Gönder", exact: true }).click();
  await expect(other.getByRole("list", { name: "Yorumlar" }).getByText(comment)).toBeVisible();

  // The guest's header counts both on the next page they open. (The number is counted
  // once per page: look again until both writes have landed.)
  await expect(async () => {
    await page.goto("/kahveler");
    await expect(bell(page)).toHaveAccessibleName("Hesap menüsü: 2 yeni bildirim", {
      timeout: 3000,
    });
  }).toPass({ timeout: 20_000 });
  await bell(page).click();
  await page.getByRole("menuitem", { name: /Bildirimler/ }).click();
  await expect(page).toHaveURL(/\/bildirimler$/);
  const liked = inbox(page).getByRole("listitem").filter({ hasText: "tadımını beğendi" }).first();
  await expect(liked).toContainText(`@${ownerUsername}`);
  await expect(liked).toContainText("Nespresso Colombia");
  await expect(liked).toContainText("Yeni");
  const commented = inbox(page).getByRole("listitem").filter({ hasText: comment });
  await expect(commented).toContainText("tadımına yorum yazdı");
  await expect(commented.getByRole("link", { name: "Nespresso Colombia" })).toHaveAttribute(
    "href",
    tastingPath!,
  );
  // Seen now: the number goes, and they are no longer new the next time.
  await expect(bell(page)).toHaveAccessibleName("Hesap menüsü");
  await page.reload();
  await expect(commented).toBeVisible();
  await expect(commented).not.toContainText("Yeni");

  // The guest answers the comment: that concerns the owner, as a reply.
  await page.goto(tastingPath!);
  const thread = page
    .getByRole("list", { name: "Yorumlar" })
    .getByRole("listitem")
    .filter({ hasText: comment })
    .first();
  await thread.getByRole("button", { name: "Yanıtla" }).click();
  await thread.getByLabel("Yanıtın", { exact: true }).fill(reply);
  await thread.getByRole("button", { name: "Gönder", exact: true }).click();
  await expect(thread.getByText(reply)).toBeVisible();

  await other.goto("/bildirimler");
  const replied = inbox(other).getByRole("listitem").filter({ hasText: reply });
  await expect(replied).toContainText("@e2e_guest");
  await expect(replied).toContainText("yorumuna yanıt verdi");

  // A like taken back before it is seen leaves nothing behind… (this one was seen, so
  // it stays, and liking again does not announce itself a second time).
  await other.goto(tastingPath!);
  await other.getByRole("button", { name: "Beğendin" }).click();
  await expect(other.getByRole("button", { name: "Beğen", exact: true })).toBeVisible();
  await other.getByRole("button", { name: "Beğen", exact: true }).click();
  await expect(other.getByRole("button", { name: "Beğendin" })).toBeVisible();
  await page.goto("/bildirimler");
  await expect(
    inbox(page).getByRole("listitem").filter({ hasText: "tadımını beğendi" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Yeni", { exact: true })).toHaveCount(0);
  await other.context().close();
});

test("a new follower is announced, and visitors have no bell", async ({ page, browser }) => {
  test.setTimeout(90_000);
  // The guest starts (or restarts) following the owner.
  await signIn(page, guest);
  await page.goto(`/u/${ownerUsername}`);
  const unfollow = page.getByRole("button", { name: "Takibi bırak" });
  const follow = page.getByRole("button", { name: "Takip et" });
  await expect(follow.or(unfollow)).toBeVisible();
  if (await unfollow.isVisible()) {
    await unfollow.click();
    await expect(follow).toBeVisible();
  }
  await follow.click();
  await expect(unfollow).toBeVisible();

  const other = await (await browser.newContext()).newPage();
  await signIn(other, owner);
  await other.goto("/bildirimler");
  await expect(
    inbox(other)
      .getByRole("listitem")
      .filter({ hasText: "seni takip etmeye başladı" })
      .filter({ hasText: "@e2e_guest" })
      .first(),
  ).toBeVisible();
  await other.context().close();

  // Unfollow again, so later runs start from the same place.
  await unfollow.click();
  await expect(follow).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(bell(visitor)).toHaveCount(0);
  await visitor.goto("/bildirimler");
  await expect(visitor).toHaveURL(/\/giris$/);
  await visitor.context().close();
});
