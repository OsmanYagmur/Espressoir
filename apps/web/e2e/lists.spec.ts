/**
 * Lists and "want to try": a member collects coffees under a title, orders and annotates
 * them, shares the list or keeps it private; one click puts a coffee on their wishlist.
 * Needs the local Supabase stack, like the other signed-in specs.
 */
import { expect, test } from "@playwright/test";

import { configured, guest, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

test("a member makes a list, fills it from two places, orders it and shares it", async ({
  page,
  browser,
}) => {
  const title = `Misafirin listesi ${Date.now().toString(36)}`;
  await signIn(page, guest);
  await page.getByRole("link", { name: "Listelerim" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Listelerim.");

  // A list needs a title.
  await page.getByLabel("Başlık", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Listeyi oluştur" }).click();
  await expect(page.getByText("Listeye bir başlık ver.")).toBeVisible();

  await page.getByLabel("Başlık", { exact: true }).fill(title);
  await page.getByLabel("Açıklama (isteğe bağlı)", { exact: true }).fill("Uçtan uca test listesi.");
  await page.getByRole("button", { name: "Listeyi oluştur" }).click();
  await expect(page).toHaveURL(/\/panel\/listeler\/[0-9a-f-]{36}$/);
  const editorUrl = page.url();
  const entries = page.getByRole("list", { name: "Kahveler", exact: true }).getByRole("listitem");
  await expect(page.getByText("Bu listede henüz kahve yok.")).toBeVisible();

  // First coffee: found in the editor.
  await page.getByLabel("Kahve ara", { exact: true }).fill("nespresso colombia");
  await page
    .getByRole("list", { name: "Bulunan kahveler" })
    .getByText("Nespresso — Colombia")
    .click();
  await page.getByRole("button", { name: "Listeye ekle" }).click();
  await expect(entries).toHaveCount(1);

  // Second coffee: added from that coffee's own page.
  await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
  await page.getByRole("button", { name: "Listeye ekle" }).click();
  const mine = page.getByRole("group", { name: "Listelerim" });
  await expect(mine.getByRole("checkbox", { name: title })).not.toBeChecked();
  await mine.getByRole("checkbox", { name: title }).check();
  await expect(mine.getByRole("checkbox", { name: title })).toBeChecked();
  // (The box goes quiet while the change is saved, and comes back with it in place.)
  await expect(mine.getByRole("checkbox", { name: title })).toBeEnabled();

  // Back in the editor both are there, in the order they were added; the second moves up
  // and gets a note.
  await page.goto(editorUrl);
  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0)).toContainText("Colombia");
  await expect(entries.nth(1)).toContainText("Ristretto (Siyah Kapsül)");
  await page.getByRole("button", { name: "Yukarı taşı: Ristretto (Siyah Kapsül)" }).click();
  await expect(entries.nth(0)).toContainText("Ristretto (Siyah Kapsül)");
  await page.getByLabel("Not (isteğe bağlı): Ristretto (Siyah Kapsül)").fill("Önce bu.");
  await entries.nth(0).getByRole("button", { name: "Notu kaydet" }).click();
  await expect(page.getByLabel("Not (isteğe bağlı): Ristretto (Siyah Kapsül)")).toHaveValue(
    "Önce bu.",
  );

  // Public at once: the list's own page, and the member's profile.
  const publicPath = await page.getByRole("link", { name: /Sayfasını gör/ }).getAttribute("href");
  expect(publicPath).toMatch(/^\/u\/e2e_guest\/liste\/misafirin-listesi-/);
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(publicPath!);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(`${title}.`);
  await expect(visitor.getByText("Uçtan uca test listesi.")).toBeVisible();
  const shown = visitor.getByRole("list", { name: "Listedeki kahveler" }).getByRole("listitem");
  await expect(shown).toHaveCount(2);
  await expect(shown.nth(0)).toContainText("Ristretto (Siyah Kapsül)");
  await expect(shown.nth(0)).toContainText("Önce bu.");
  await expect(shown.nth(1)).toContainText("Colombia");
  await visitor.goto("/u/e2e_guest");
  await expect(visitor.getByRole("list", { name: "Listeler" })).toContainText(title);

  // Made private, it is gone for everyone else; renamed, its address stays.
  await page.getByLabel("Başlık", { exact: true }).fill(`${title} (özel)`);
  await page.getByLabel("Gizli: yalnızca sen görürsün").check();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("Kaydedildi.")).toBeVisible();
  await visitor.goto(publicPath!);
  await expect(visitor.getByRole("heading", { name: "Bu fincan boş çıktı" })).toBeVisible();
  await visitor.context().close();

  // Taking a coffee off and deleting the list.
  await page.getByRole("button", { name: "Çıkar: Colombia" }).click();
  await expect(entries).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Listeyi sil" }).click();
  await expect(page).toHaveURL(/\/panel\/listeler$/);
  await expect(page.getByText(`${title} (özel)`)).toHaveCount(0);
});

test("one click puts a coffee on the member's want-to-try list, another takes it off", async ({
  page,
}) => {
  const coffee = "/kahve/jacobs/classico-lungo";
  await signIn(page, guest);
  await page.goto(coffee);
  const want = page.getByRole("button", { name: /Denemek istiyorum|Denenecekler listemde/ });
  // A rerun may find it already there: start from "not wanted".
  if ((await want.getAttribute("aria-pressed")) === "true") {
    await want.click();
    await expect(want).toHaveAttribute("aria-pressed", "false");
    await expect(want).toBeEnabled();
  }

  // The button answers at once and is busy until the change is saved: wait for that
  // before looking at pages that are built from what was saved.
  await want.click();
  await expect(want).toHaveAttribute("aria-pressed", "true");
  await expect(want).toHaveText("Denenecekler listemde");
  await expect(want).toBeEnabled();
  // The public pages know at once: the coffee counts it, the profile lists it.
  await page.reload();
  await expect(page.getByText("1 kişi denemek istiyor")).toBeVisible();
  await expect(want).toHaveAttribute("aria-pressed", "true");
  await page.goto("/u/e2e_guest");
  await expect(page.getByRole("list", { name: "Denenecekler" })).toContainText("Classico Lungo");

  await page.goto(coffee);
  await want.click();
  await expect(want).toHaveAttribute("aria-pressed", "false");
  await expect(want).toBeEnabled();
  await page.reload();
  await expect(page.getByText(/kişi denemek istiyor/)).toHaveCount(0);
});
