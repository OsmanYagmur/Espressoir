/**
 * Pictures: a member adds one to a tasting and one to their profile. The browser shrinks
 * and re-encodes them before uploading, so what Storage holds is small and carries none of
 * what the camera wrote beside the pixels (the location above all). Needs the local
 * Supabase stack with Storage, like the other signed-in specs.
 */
import { fileURLToPath } from "node:url";

import { expect, test, type APIRequestContext } from "@playwright/test";

import { configured, guest, signIn } from "./helpers";

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

// 2400 × 1800 JPEG with a GPS position, a camera make and model in its EXIF block.
const PHOTO = fileURLToPath(new URL("./fixtures/photo-with-location.jpg", import.meta.url));

/** Fetches a stored picture and checks it is small, an image, and free of EXIF. */
async function expectClean(request: APIRequestContext, src: string | null) {
  expect(src).toMatch(/\/storage\/v1\/object\/public\/media\//);
  const response = await request.get(src!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/^image\/(webp|jpeg)/);
  const body = await response.body();
  expect(body.length).toBeLessThanOrEqual(600 * 1024);
  // No EXIF block at all, so no location, camera or time either.
  expect(body.includes(Buffer.from("Exif"))).toBe(false);
  expect(body.includes(Buffer.from("Konum Testi"))).toBe(false);
}

test("a member adds a picture to a tasting, without the place it was taken", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const note = `Fotoğraflı tadım ${Date.now().toString(36)}`;
  await signIn(page, guest);
  await page.goto("/panel/tadim/yeni");
  await page.getByLabel("Kahve ara", { exact: true }).fill("nespresso colombia");
  await page
    .getByRole("list", { name: "Bulunan kahveler" })
    .getByText("Nespresso — Colombia")
    .click();
  await page.getByRole("group", { name: "Puan" }).getByText("8", { exact: true }).click();
  await page.getByLabel("Not", { exact: true }).fill(note);
  await page.getByText("Ayrıntılar (isteğe bağlı)").click();

  // Picking the file prepares and uploads it at once; the form then knows where it went.
  await page.getByLabel("Fotoğraf seç", { exact: true }).setInputFiles(PHOTO);
  await expect(page.locator('input[name="photoPath"]')).toHaveValue(
    /^tastings\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/,
    { timeout: 30_000 },
  );
  await expect(page.locator('input[name="photoWidth"]')).toHaveValue("1600");
  await expect(page.locator('input[name="photoHeight"]')).toHaveValue("1200");
  await page.getByLabel("Fotoğrafta ne var? (isteğe bağlı)").fill("Üstten fincan, krema");
  await page.getByRole("button", { name: "Kaydet" }).click();

  // In lists: the small twin, leading to the tasting's page.
  await expect(page).toHaveURL(/\/kahve\/nespresso\/colombia$/);
  const mine = page
    .getByRole("list", { name: "Tadımlar" })
    .getByRole("listitem")
    .filter({ hasText: note });
  const small = mine.getByRole("img", { name: "Üstten fincan, krema" });
  await expect(small).toHaveAttribute("width", "480");
  await expect(small).toHaveAttribute("height", "360");
  await expectClean(request, await small.getAttribute("src"));

  // On its page: the full picture, with its description underneath.
  await mine.getByRole("link", { name: /beğeni · \d+ yorum/ }).click();
  const full = page.getByRole("img", { name: "Üstten fincan, krema" });
  await expect(full).toHaveAttribute("width", "1600");
  await expect(full).toHaveAttribute("height", "1200");
  const fullSrc = await full.getAttribute("src");
  await expectClean(request, fullSrc);
  const tastingUrl = page.url();

  // Taken off again: gone from the page, and the file itself is gone from Storage.
  await page.goto("/panel");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Colombia" })
    .first()
    .getByRole("link", { name: "Düzenle" })
    .click();
  await expect(page.getByLabel("Not", { exact: true })).toHaveValue(note);
  await page.getByRole("button", { name: "Fotoğrafı kaldır" }).click();
  await expect(page.locator('input[name="photoPath"]')).toHaveValue("");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(tastingUrl);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "Üstten fincan, krema" })).toHaveCount(0);
  expect((await request.get(fullSrc!)).ok()).toBe(false);
});

test("a member sets a profile picture, cropped square, and can take it away", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await signIn(page, guest);
  await page.goto("/hesap");
  await page.getByLabel(/^(Resim seç|Değiştir)$/).setInputFiles(PHOTO);
  await expect(page.getByText("Profil resmin güncellendi.")).toBeVisible({ timeout: 30_000 });

  await page.goto("/u/e2e_guest");
  const avatar = page.getByRole("img", { name: "@e2e_guest profil resmi" });
  await expect(avatar).toBeVisible();
  await expectClean(request, await avatar.getAttribute("src"));

  await page.goto("/hesap");
  await page.getByRole("button", { name: "Resmi kaldır" }).click();
  await expect(page.getByText("Profil resmin kaldırıldı.")).toBeVisible();
  await page.goto("/u/e2e_guest");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "@e2e_guest profil resmi" })).toHaveCount(0);
});
