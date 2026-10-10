/**
 * The public archive, checked against the sample export (scripts/notion/fixtures): the
 * same data whether the site reads a seeded Supabase (CI) or an offline snapshot (local).
 */
import { expect, test, type Page } from "@playwright/test";

const coffeeList = (page: Page) => page.getByRole("list", { name: "Kahveler" });
const mainNav = (page: Page) =>
  page.getByRole("navigation", { name: "Ana menü" }).locator("visible=true");

test.describe("home", () => {
  test("shows the notebook's numbers and the latest tastings", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Espressoir/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tadım defteri.");

    // 17 tastings of 20 coffees from 8 brands; 3 coffees are still on the wishlist.
    const fields = page.locator("dl").first();
    await expect(fields).toContainText("17");
    await expect(fields).toContainText("3 tanesi denenecek");
    await expect(fields).toContainText("n = 16");

    const latest = page.getByRole("list", { name: "Son tadımlar" });
    await expect(latest.getByRole("listitem")).toHaveCount(8);
    await expect(latest.getByRole("listitem").first()).toContainText("10 Eki 2026");
    await expect(latest.getByRole("link", { name: "Original Taste" })).toBeVisible();
  });

  test("welcomes every brew method, not only espresso", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Türk Kahvesi", { exact: true })).toBeVisible();
    await expect(page.getByText("French Press", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "10 üzerinden 8 puan" }).first()).toBeVisible();
  });
});

test.describe("coffee list", () => {
  test("is reachable from the main navigation and lists everything", async ({ page }) => {
    await page.goto("/");
    await mainNav(page).getByRole("link", { name: "Kahveler" }).click();
    await expect(page).toHaveURL(/\/kahveler$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kahveler.");
    await expect(page.getByRole("status")).toContainText("20 kahve");
    await expect(coffeeList(page).getByRole("listitem")).toHaveCount(20);
  });

  test("filters by brand, score and text, and keeps the state in the URL", async ({ page }) => {
    await page.goto("/kahveler");

    await page.getByLabel("Marka").selectOption({ label: "Nespresso" });
    await expect(page).toHaveURL(/marka=nespresso/);
    await expect(coffeeList(page).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByRole("status")).toContainText("20 kahveden 3 tanesi");

    await page.getByLabel("En az puan").selectOption("8");
    await expect(page).toHaveURL(/min=8/);
    await expect(coffeeList(page).getByRole("listitem")).toHaveCount(2);

    await page.getByLabel("Ara").fill("RİST");
    await expect(coffeeList(page).getByRole("listitem")).toHaveCount(1);
    await expect(coffeeList(page)).toContainText("Ristretto (Siyah Kapsül)");

    await page.getByRole("button", { name: "Filtreleri temizle" }).click();
    await expect(page).toHaveURL(/\/kahveler$/);
    await expect(coffeeList(page).getByRole("listitem")).toHaveCount(20);
  });

  test("restores a shared link: filters, sort order and view", async ({ page }) => {
    await page.goto("/kahveler?form=kapsul&yontem=kapsul-makinesi&sirala=puan&gorunum=kart");
    await expect(page.getByLabel("Form")).toHaveValue("capsule");
    await expect(page.getByLabel("Sırala")).toHaveValue("score_desc");
    await expect(page.getByRole("button", { name: "Kart" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const items = coffeeList(page).getByRole("listitem");
    // Seven capsules were brewed in the capsule machine; the two on the wishlist do not count.
    await expect(items).toHaveCount(7);
    await expect(items.first()).toContainText("Ristretto (Siyah Kapsül)");
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.goto("/kahveler?q=boyle-bir-kahve-yok");
    await expect(page.getByText("Bu filtrelere uyan kahve yok.")).toBeVisible();
  });
});

test.describe("coffee page", () => {
  test("shows the tasting, the label details and structured data", async ({ page }) => {
    await page.goto("/kahveler");
    await page.getByRole("link", { name: "Ristretto (Siyah Kapsül)" }).click();
    await expect(page).toHaveURL(/\/kahve\/nespresso\/ristretto-siyah-kapsul$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ristretto (Siyah Kapsül).");

    await expect(page.getByRole("img", { name: "10 üzerinden 9 puan" }).first()).toBeVisible();
    const tastings = page.getByRole("list", { name: "Tadımlar" });
    await expect(tastings).toContainText("Çok yoğun, kısa ve net.");
    await expect(tastings).toContainText("Kapsül Makinesi · Nespresso C30");
    await expect(page.getByText("Nespresso Original")).toBeVisible();

    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    );
    expect(jsonLd).toMatchObject({
      "@type": "Product",
      name: "Nespresso Ristretto (Siyah Kapsül)",
      aggregateRating: { ratingValue: 9, ratingCount: 1, bestRating: 10 },
    });
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );

    await expect(page.getByRole("list", { name: "Benzer kahveler" })).toContainText("Colombia");
  });

  test("marks a coffee that has not been tasted yet", async ({ page }) => {
    await page.goto("/kahve/jacobs/intenso-lungo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("İntenso Lungo.");
    await expect(page.getByRole("img", { name: "Puansız" }).first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Tadımlar" })).toContainText("Denenecek");
  });

  test("answers 404 for a coffee that does not exist", async ({ page }) => {
    const response = await page.goto("/kahve/nespresso/boyle-bir-kahve-yok");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Bu fincan boş çıktı" })).toBeVisible();
  });
});

test("brand page lists the brand's coffees with its average", async ({ page }) => {
  await page.goto("/marka/jacobs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jacobs.");
  const coffees = page.getByRole("list", { name: "Kahveleri" });
  await expect(coffees.getByRole("listitem")).toHaveCount(4);
  await expect(coffees).toContainText("Classico Lungo");
  // Scores 5, 6 and 7 → 6,0 over three rated tastings.
  await expect(page.locator("dl").first()).toContainText("6,0");
  await expect(page.locator("dl").first()).toContainText("n = 3");
});

test("statistics show n beside every average and flag small samples", async ({ page }) => {
  await page.goto("/istatistik");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("İstatistik.");

  const brands = page.getByRole("table", { name: "Marka ortalamaları" });
  const nespresso = brands.getByRole("row", { name: /Nespresso/ });
  await expect(nespresso.getByRole("cell").first()).toHaveText("3");
  await expect(nespresso).toContainText("8,0");
  // A single Nescafe tasting is not a trend.
  await expect(brands.getByRole("row", { name: /Nescafe/ })).toContainText("n < 3");

  await expect(page.getByRole("list", { name: "Puan dağılımı" }).getByRole("listitem")).toHaveCount(
    10,
  );
  await expect(page.getByRole("table", { name: "Forma göre ortalama" })).toContainText("Kapsül");
});

test("theme can be switched to dark and back", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  await page.getByTestId("theme-toggle").click();
  await page.getByRole("menuitemradio", { name: "Koyu" }).click();
  await expect(html).toHaveClass(/dark/);
  // Wait for the menu's close animation before reopening it.
  await expect(page.getByRole("menu")).toBeHidden();

  await page.getByTestId("theme-toggle").click();
  await page.getByRole("menuitemradio", { name: "Açık" }).click();
  await expect(html).not.toHaveClass(/dark/);
});

test("unknown pages show the Turkish 404", async ({ page }) => {
  const response = await page.goto("/boyle-bir-sayfa-yok");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Bu fincan boş çıktı" })).toBeVisible();
});

test("search engines get a sitemap and are kept out of the signed-in area", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/kahve/nespresso/ristretto-siyah-kapsul</loc>");
  expect(sitemap).toContain("/marka/kahve-dunyasi</loc>");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /panel");
  expect(robots).toContain("Sitemap:");
});

test("the signed-in area sends visitors to the login page", async ({ page }) => {
  await page.goto("/panel/tadim/yeni");
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Giriş.");
  await expect(page.getByLabel("E-posta")).toBeVisible();
});
