/**
 * Tastings from more than one person: finding a coffee instead of adding it twice, the
 * "not reviewed" mark on a member's new coffee, following, and the two feeds. Needs the
 * local Supabase stack, like the other signed-in specs.
 */
import { expect, test, type Page } from "@playwright/test";

import { configured, guest, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

const RISTRETTO = "Nespresso — Ristretto (Siyah Kapsül)";
const ownerUsername = process.env.OWNER_USERNAME ?? "owner";

async function newTasting(page: Page) {
  await page.goto("/panel/tadim/yeni");
  await expect(page.getByLabel("Kahve ara", { exact: true })).toBeVisible();
}

test("a member finds an existing coffee despite a typo and adds their own tasting", async ({
  page,
}) => {
  await signIn(page, guest);
  await newTasting(page);

  await page.getByLabel("Kahve ara", { exact: true }).fill("nespreso ristreto");
  await page.getByRole("list", { name: "Bulunan kahveler" }).getByText(RISTRETTO).click();
  await expect(page.getByText("Seçilen kahve")).toBeVisible();

  await page.getByRole("group", { name: "Puan" }).getByText("6", { exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill("Misafirin notu: bana fazla sert.");
  await page.getByRole("button", { name: "Kaydet" }).click();

  // The coffee's page now carries both tastings, each under its author's name, and the
  // score is the average of the two (9 and 6).
  await expect(page).toHaveURL(/\/kahve\/nespresso\/ristretto-siyah-kapsul$/);
  const tastings = page.getByRole("list", { name: "Tadımlar" });
  await expect(tastings.getByRole("listitem")).toHaveCount(2);
  await expect(tastings.getByRole("link", { name: "@e2e_guest" })).toBeVisible();
  await expect(tastings.getByRole("link", { name: `@${ownerUsername}` })).toBeVisible();
  await expect(page.getByRole("img", { name: "10 üzerinden 7,5 puan" }).first()).toBeVisible();

  // It is in the public feed without waiting for the hourly refresh.
  await page.goto("/akis");
  await expect(page.getByRole("list", { name: "Herkes" })).toContainText(
    "Misafirin notu: bana fazla sert.",
  );
});

test("typing a coffee that already exists as new brings up the existing one", async ({ page }) => {
  await signIn(page, guest);
  await newTasting(page);
  await page.getByText("Yeni kahve", { exact: true }).click();
  await page.getByLabel("Marka", { exact: true }).fill("nespresso");
  await page.getByLabel("Kahve adı", { exact: true }).fill("Ristreto Siyah Kapsul");

  const similar = page.getByRole("list", { name: "Bu kahve zaten kayıtlı olabilir:" });
  await expect(similar.getByText(RISTRETTO)).toBeVisible();
  await similar.getByRole("button", { name: "Bunu seç" }).first().click();
  await expect(page.getByText("Seçilen kahve")).toBeVisible();
  await expect(page.getByText(RISTRETTO)).toBeVisible();
});

test("a coffee a member adds is public at once, marked as not reviewed", async ({
  page,
  request,
}) => {
  const coffeeName = `Üye Harmanı ${Date.now()}`;
  const slug = `uye-harmani-${coffeeName.split(" ").at(-1)}`;

  await signIn(page, guest);
  await newTasting(page);
  await page.getByLabel("Kahve ara", { exact: true }).fill(coffeeName);
  await expect(page.getByText("Buna benzeyen bir kahve bulunamadı.")).toBeVisible();
  // What was typed into the search carries over as the new coffee's name.
  await page.getByRole("button", { name: "Aradığım burada yok, yeni kahve ekle" }).click();
  await expect(page.getByLabel("Kahve adı", { exact: true })).toHaveValue(coffeeName);
  await page.getByLabel("Marka", { exact: true }).fill("E2E Üye Kavurucu");
  await page.getByRole("group", { name: "Puan" }).getByText("8", { exact: true }).click();
  await page.getByRole("button", { name: "Kaydet" }).click();

  await expect(page).toHaveURL(new RegExp(`/kahve/e2e-uye-kavurucu/${slug}$`));
  await expect(page.getByRole("note")).toContainText("Doğrulanmadı");

  // Listed for people, not yet for search engines.
  await page.goto(`/kahveler?q=${encodeURIComponent(coffeeName)}`);
  await expect(page.getByRole("list", { name: "Kahveler" }).getByRole("listitem")).toHaveCount(1);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain(slug);
  // A coffee the owner entered has no such mark.
  await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
  await expect(page.getByRole("note")).toHaveCount(0);
});

test("following someone fills the feed of followed people", async ({ page }) => {
  await signIn(page, guest);

  await page.goto("/akis?sekme=takip");
  await expect(page.getByText("Takip ettiklerin henüz bir şey eklememiş.")).toBeVisible();

  await page.goto(`/u/${ownerUsername}`);
  await page.getByRole("button", { name: "Takip et" }).click();
  await expect(page.getByRole("button", { name: "Takibi bırak" })).toBeVisible();

  await page.goto("/akis?sekme=takip");
  const followed = page.getByRole("list", { name: "Takip ettiklerim" });
  await expect(followed.getByRole("listitem").first()).toBeVisible();
  // Only the followed person's entries: none of the guest's own.
  await expect(followed.getByRole("link", { name: "@e2e_guest" })).toHaveCount(0);
  await expect(followed.getByRole("link", { name: `@${ownerUsername}` }).first()).toBeVisible();

  // Ten at a time. The imported entries share one timestamp, so paging has to break the
  // tie by id to neither skip nor repeat any of them.
  await expect(followed.getByRole("listitem")).toHaveCount(10);
  await page.getByRole("button", { name: "Daha fazla göster" }).click();
  await expect(page.getByText("Akışın sonu.")).toBeVisible();
  const links = await followed
    .getByRole("heading", { level: 3 })
    .getByRole("link")
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")));
  const coffees = links.filter((href) => href?.startsWith("/kahve/"));
  expect(coffees.length).toBeGreaterThanOrEqual(17);
  // Each of the owner's 17 imported tastings is of a different coffee.
  expect(new Set(coffees).size).toBe(coffees.length);

  // One's own page has no follow button; unfollowing empties the feed again.
  await page.goto("/u/e2e_guest");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Takip/ })).toHaveCount(0);
  await page.goto(`/u/${ownerUsername}`);
  await page.getByRole("button", { name: "Takibi bırak" }).click();
  await expect(page.getByRole("button", { name: "Takip et" })).toBeVisible();
});

test("a member gives a tasting a taste profile and tags, and changes them later", async ({
  page,
}) => {
  const note = `Etiketli tadım ${Date.now().toString(36)}`;
  const tag = (group: string, name: string) =>
    page.getByRole("group", { name: group, exact: true }).getByText(name, { exact: true });
  await signIn(page, guest);
  await newTasting(page);

  await page.getByLabel("Kahve ara", { exact: true }).fill("nespresso colombia");
  await page
    .getByRole("list", { name: "Bulunan kahveler" })
    .getByText("Nespresso — Colombia")
    .click();
  await page.getByRole("group", { name: "Puan" }).getByText("8", { exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill(note);

  await page.getByText("Ayrıntılar (isteğe bağlı)").click();
  await page.getByLabel("Gövde", { exact: true }).selectOption("4");
  await page.getByLabel("Asidite", { exact: true }).selectOption("3");
  await page.getByLabel("Bitiş", { exact: true }).selectOption("5");
  await tag("Çikolata ve kakao", "Kakao").click();
  await tag("Kuruyemiş", "Fındık").click();
  await expect(page.getByText("2 / 5 seçili")).toBeVisible();

  // Five is the limit: the boxes that are left go quiet until one is given back.
  for (const name of ["Karamel", "Vanilya", "Bal"]) await tag("Tatlı", name).click();
  await expect(page.getByText("5 / 5 seçili")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Tarçın" })).toBeDisabled();
  for (const name of ["Karamel", "Vanilya", "Bal"]) await tag("Tatlı", name).click();
  await expect(page.getByRole("checkbox", { name: "Tarçın" })).toBeEnabled();
  await page.getByRole("button", { name: "Kaydet" }).click();

  // On the coffee's page the tasting carries its tags, in the order of the tag list.
  await expect(page).toHaveURL(/\/kahve\/nespresso\/colombia$/);
  const mine = page
    .getByRole("list", { name: "Tadımlar" })
    .getByRole("listitem")
    .filter({ hasText: note });
  await expect(mine.getByText("Tat etiketleri: Kakao, Fındık")).toBeVisible();

  // Its own page draws the profile; the corners left empty say so.
  await mine.getByRole("link", { name: /beğeni · \d+ yorum/ }).click();
  await expect(
    page.getByRole("img", {
      name: "Tat profili grafiği: Gövde 4/5, Asidite 3/5, Acılık —, Tatlılık —, Bitiş 5/5",
    }),
  ).toBeVisible();

  // Editing shows what was chosen and saves the new set.
  await page.goto("/panel");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Colombia" })
    .first()
    .getByRole("link", { name: "Düzenle" })
    .click();
  await expect(page.getByLabel("Not", { exact: true })).toHaveValue(note);
  await expect(page.getByRole("checkbox", { name: "Kakao", exact: true })).toBeChecked();
  await expect(page.getByText("2 / 5 seçili")).toBeVisible();
  await tag("Çikolata ve kakao", "Kakao").click();
  await tag("Tatlı", "Bal").click();
  await page.getByLabel("Tatlılık", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto("/kahve/nespresso/colombia");
  await expect(mine.getByText("Tat etiketleri: Fındık, Bal")).toBeVisible();
});
