/**
 * The public archive, checked against the sample export (scripts/notion/fixtures): the
 * same data whether the site reads a seeded Supabase (CI) or an offline snapshot (local).
 */
import { expect, test, type Page } from "@playwright/test";

const coffeeList = (page: Page) => page.getByRole("list", { name: "Kahveler" });
const mainNav = (page: Page) => page.getByRole("navigation", { name: "Ana menü" });
/** The catalog pages sit in a member's menu; everyone finds them in the footer. */
const exploreNav = (page: Page) => page.getByRole("navigation", { name: "Keşfet" });

test.describe("home", () => {
  test("says what the site is, leads to the open workshop and shows the latest", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Espressoir/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("İçtiğin her kahveyi kaydet.");

    // One main action: the open workshop's form. "Nasıl çalışır?" sits beside it as a link.
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Atölyeye başvur" })).toHaveAttribute(
      "href",
      "/atolye#basvuru",
    );
    await expect(main.getByRole("link", { name: "Nasıl çalışır?" })).toHaveAttribute(
      "href",
      "/hakkinda#nasil-calisir",
    );

    const workshop = page.getByRole("region", { name: "Sıradaki atölye" });
    await expect(workshop.getByRole("heading", { name: "Kahveye giriş atölyesi" })).toBeVisible();
    await expect(workshop).toContainText("8 kişilik · 8 yer kaldı");
    await expect(workshop.getByRole("link", { name: "Detaylar" })).toHaveAttribute(
      "href",
      "/atolye",
    );

    const latest = page.getByRole("list", { name: "Son tadımlar" });
    await expect(latest.getByRole("listitem")).toHaveCount(3);
    await expect(latest.getByRole("listitem").first()).toContainText(/10 Eki/);
    await expect(latest.getByRole("link", { name: /Original Taste/ })).toBeVisible();
    await expect(page.getByRole("img", { name: "Puan: 8 / 10" }).first()).toBeVisible();

    await expect(
      page.getByRole("list", { name: "Merak ettiklerin" }).getByRole("listitem"),
    ).toHaveCount(3);
    // The numbers, the top coffees and the brew methods live on the statistics page now.
    await expect(page.getByText("En yüksek puanlılar")).toHaveCount(0);
  });

  test("the about page welcomes every brew method, not only espresso", async ({ page }) => {
    await page.goto("/hakkinda");
    await expect(page.getByRole("heading", { name: "Nasıl çalışır?" })).toBeVisible();
    await expect(page.getByText("Türk Kahvesi", { exact: true })).toBeVisible();
    await expect(page.getByText("French Press", { exact: true })).toBeVisible();
  });
});

test.describe("coffee list", () => {
  test("is reachable from the main navigation and lists everything", async ({ page }) => {
    await page.goto("/");
    await exploreNav(page).getByRole("link", { name: "Kahveler" }).click();
    await expect(page).toHaveURL(/\/kahveler$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kahveler");
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
    await page.getByRole("link", { name: /Ristretto \(Siyah Kapsül\)/ }).click();
    await expect(page).toHaveURL(/\/kahve\/nespresso\/ristretto-siyah-kapsul$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ristretto (Siyah Kapsül)");

    await expect(page.getByRole("img", { name: "Puan: 9 / 10" }).first()).toBeVisible();
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("İntenso Lungo");
    await expect(page.getByRole("img", { name: "Puansız" }).first()).toBeVisible();
    // Nobody has tasted it; someone has it on their "want to try" list, which is counted.
    await expect(page.getByText("Bu kahveyi henüz kimse tatmadı.")).toBeVisible();
    await expect(page.getByText("1 kişi denemek istiyor")).toBeVisible();
  });

  test("answers 404 for a coffee that does not exist", async ({ page }) => {
    const response = await page.goto("/kahve/nespresso/boyle-bir-kahve-yok");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Bu fincan boş çıktı" })).toBeVisible();
  });
});

test("a brand's page without an official account invites one", async ({ page }) => {
  await page.goto("/marka/nespresso");
  await expect(page.getByRole("link", { name: /Bu işletme senin mi\?/ })).toHaveAttribute(
    "href",
    /^\/panel\/isletme\/basvuru\/marka\/[0-9a-f-]{36}$/,
  );
  await page.goto("/kafe/istanbul/ornek-kahve-atolyesi");
  await expect(page.getByRole("link", { name: /Bu işletme senin mi\?/ })).toHaveAttribute(
    "href",
    /^\/panel\/isletme\/basvuru\/kafe\/[0-9a-f-]{36}$/,
  );
});

test("brand page lists the brand's coffees with its average", async ({ page }) => {
  await page.goto("/marka/jacobs");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jacobs");
  const coffees = page.getByRole("list", { name: "Kahveleri" });
  await expect(coffees.getByRole("listitem")).toHaveCount(4);
  await expect(coffees).toContainText("Classico Lungo");
  // Scores 5, 6 and 7 → 6,0 over three rated tastings.
  await expect(page.locator("dl").first()).toContainText("6,0");
  await expect(page.locator("dl").first()).toContainText("n = 3");
});

test("statistics show n beside every average and flag small samples", async ({ page }) => {
  await page.goto("/istatistik");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("İstatistik");
  // What the home page used to carry: the archive's numbers, the top coffees, the methods.
  const figures = page.locator("dl").first();
  await expect(figures).toContainText("17");
  await expect(figures).toContainText("3 tanesi denenecek");
  await expect(figures).toContainText("n = 16");
  await expect(
    page.getByRole("list", { name: "En yüksek puanlılar" }).getByRole("listitem"),
  ).toHaveCount(5);
  await expect(page.getByRole("list", { name: "Hangi yöntemle demleniyor?" })).toContainText(
    "Kapsül Makinesi",
  );

  const brands = page.getByRole("table", { name: "Marka ortalamaları" });
  const nespresso = brands.getByRole("row", { name: /Nespresso/ });
  await expect(nespresso.getByRole("cell").first()).toHaveText("3");
  await expect(nespresso).toContainText("8,0");
  // A single Nescafe tasting is not a trend.
  await expect(brands.getByRole("row", { name: /Nescafe/ })).toContainText("Az tadım");

  await expect(page.getByRole("list", { name: "Puan dağılımı" }).getByRole("listitem")).toHaveCount(
    10,
  );
  await expect(page.getByRole("table", { name: "Forma göre ortalama" })).toContainText("Kapsül");
});

test("theme can be switched to dark and back", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const colours = page.getByTestId("theme-switch");

  await colours.getByRole("button", { name: "Koyu" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(colours.getByRole("button", { name: "Koyu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await colours.getByRole("button", { name: "Açık" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("the main menu has the feed, the workshop and the articles", async ({ page }) => {
  await page.goto("/bilgi");
  const links = mainNav(page).getByRole("link");
  await expect(links).toHaveText(["Tadımlar", "Atölye", "Bilgi"]);
  await expect(mainNav(page).getByRole("link", { name: "Bilgi" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("no page is wider than a phone's screen", async ({ page }) => {
  for (const path of [
    "/",
    "/kahveler",
    "/akis",
    "/istatistik",
    "/kahve/nespresso/ristretto-siyah-kapsul",
    "/kafeler",
    "/kafe/istanbul/ornek-kahve-atolyesi",
    "/atolye",
    "/bilgi",
    "/bilgi/oran",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
});

test("the site can go on a phone's home screen and open like an app", async ({ page, request }) => {
  await page.goto("/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "Espressoir",
  );

  const manifest = (await (await request.get(manifestHref!)).json()) as {
    name: string;
    display: string;
    start_url: string;
    lang: string;
    icons: { src: string; sizes: string; purpose?: string }[];
    shortcuts: { name: string; url: string }[];
  };
  expect(manifest).toMatchObject({
    name: "Espressoir",
    display: "standalone",
    start_url: "/",
    lang: "tr",
  });
  expect(manifest.icons.map((icon) => icon.sizes).sort()).toEqual([
    "192x192",
    "512x512",
    "512x512",
  ]);
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  expect(manifest.shortcuts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Tadım ekle", url: "/panel/tadim/yeni" }),
      expect.objectContaining({ name: "Tadımlar", url: "/akis" }),
    ]),
  );
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
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
  expect(sitemap).toContain("/kafe/istanbul/ornek-kahve-atolyesi</loc>");
  expect(sitemap).toContain("/atolye</loc>");
  expect(sitemap).toContain("/bilgi/ogutme</loc>");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /panel");
  expect(robots).toContain("Disallow: /uygulama");
  expect(robots).toContain("Disallow: /osman");
  expect(robots).toContain("Sitemap:");
});

test("the mobile app's CAPTCHA page shows only the check, over the site", async ({ page }) => {
  await page.goto("/uygulama/dogrulama");
  await expect(page.getByText(/robot olmadığını doğruluyoruz/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("only a signed-in member may ask the site to refresh its archive", async ({ request }) => {
  expect((await request.post("/api/arsiv-tazele")).status()).toBe(401);
  const forged = await request.post("/api/arsiv-tazele", {
    headers: { Authorization: "Bearer not-a-real-token" },
  });
  expect(forged.status()).toBe(401);
});

test("the signed-in area sends visitors to the login page", async ({ page }) => {
  await page.goto("/panel/oneriler");
  await expect(page).toHaveURL(/\/giris$/);
  await page.goto("/panel/tadim/yeni");
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Giriş");
  await expect(page.getByLabel("E-posta")).toBeVisible();
});

test("/osman asks a visitor for an admin's e-mail and password, right there", async ({ page }) => {
  await page.goto("/osman/atolyeler");
  await expect(page).toHaveURL(/\/osman\/atolyeler$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yönetim");
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Parola", { exact: true })).toBeVisible();
  // Nothing of the admin area before the sign-in, and no way in by e-mail code or Google.
  await expect(page.getByRole("navigation", { name: "Yönetim bölümleri" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Giriş kodu gönder" })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // The old address still leads there.
  await page.goto("/panel/yonetim");
  await expect(page).toHaveURL(/\/osman\/yonetim$/);
});

test.describe("members and legal texts", () => {
  test("a member's notebook is a public page listed in the sitemap", async ({ page, request }) => {
    // The archive's owner is the one member of the sample data; the sitemap knows the name.
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const path = /<loc>[^<]*(\/u\/[a-z0-9_]+)<\/loc>/.exec(sitemap)?.[1];
    expect(path).toBeTruthy();

    await page.goto(path!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`@${path!.slice(3)}`);
    // 17 public tastings, one of them unscored; 3 coffees wait on the wishlist.
    const fields = page.locator("dl").first();
    await expect(fields).toContainText("17");
    await expect(fields).toContainText("3 denenecek");
    await expect(fields).toContainText("n = 16");
    await expect(page.getByRole("list", { name: "Tadımlar" }).getByRole("listitem")).toHaveCount(
      17,
    );
    await expect(
      page.getByRole("list", { name: "Denenecekler" }).getByRole("listitem"),
    ).toHaveCount(3);
  });

  test("an unknown member is a 404", async ({ page }) => {
    const response = await page.goto("/u/boyle_biri_yok");
    expect(response?.status()).toBe(404);
  });

  test("the legal texts are linked from every page and marked as drafts", async ({ page }) => {
    await page.goto("/");
    const legal = page.getByRole("navigation", { name: "Yasal metinler" });
    for (const [link, heading] of [
      ["KVKK", "KVKK aydınlatma metni"],
      ["Gizlilik", "Gizlilik politikası"],
      ["Koşullar", "Kullanım koşulları"],
    ] as const) {
      await legal.getByRole("link", { name: link }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByRole("note")).toContainText("Taslak");
    }
  });

  test("the header leads visitors to the login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Giriş" }).click();
    await expect(page).toHaveURL(/\/giris$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Giriş");
    await expect(page.getByText(/Kayıt şimdilik davetle\./)).toBeVisible();
  });
});

test.describe("community", () => {
  test("the feed lists the latest entries with who wrote them", async ({ page }) => {
    await page.goto("/");
    await mainNav(page).getByRole("link", { name: "Tadımlar" }).click();
    await expect(page).toHaveURL(/\/akis$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tadımlar");

    // The first ten of the 17 logged tastings come with the page; the rest is on request.
    const entries = page.getByRole("list", { name: "Herkes" }).getByRole("listitem");
    await expect(entries).toHaveCount(10);
    // Each card is one link to the tasting, and says who wrote it.
    await expect(entries.first()).toContainText(/@[a-z0-9_]+/);
    await expect(entries.first().getByRole("link")).toHaveAttribute("href", /^\/tadim\//);
    await expect(page.getByRole("button", { name: "Daha fazla göster" })).toBeVisible();
  });

  test("the feed of followed people asks visitors to sign in", async ({ page }) => {
    await page.goto("/akis");
    await page.getByRole("tab", { name: "Takip ettiklerim" }).click();
    await expect(page).toHaveURL(/\/akis\?sekme=takip$/);
    await expect(
      page.getByText("Takip ettiklerinin tadımlarını görmek için giriş yap."),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Herkes" }).click();
    await expect(page.getByRole("list", { name: "Herkes" })).toBeVisible();
  });

  test("a tasting names its author, who has a notebook with charts", async ({ page }) => {
    await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
    await page.getByRole("list", { name: "Tadımlar" }).getByRole("link").first().click();
    await expect(page).toHaveURL(/\/tadim\/[0-9a-f-]{36}$/);
    await page.getByRole("main").getByRole("link", { name: /^@/ }).click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    await expect(page.getByRole("list", { name: "Puan dağılımı" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Yönteme göre/ })).toBeVisible();
    // Visitors are offered the login instead of a follow that cannot work.
    await expect(page.getByRole("link", { name: "Takip et" })).toHaveAttribute("href", "/giris");
  });
});

test.describe("taste profile and flavour tags", () => {
  const RISTRETTO = "/kahve/nespresso/ristretto-siyah-kapsul";
  /** Opens the first tasting card of a coffee: the card is one link to its page. */
  async function openTastingOf(page: Page, coffeePage: string) {
    await page.goto(coffeePage);
    await page.getByRole("list", { name: "Tadımlar" }).getByRole("link").first().click();
    await expect(page).toHaveURL(/\/tadim\/[0-9a-f-]{36}$/);
  }
  /** The rows of a taste profile, each read aloud as "Gövde: 5/5, yoğun". */
  const profileRows = (page: Page) =>
    page.getByRole("img", { name: /^(Gövde|Asidite|Tatlılık|Acılık|Bitiş):/ });

  test("a tasting carries its notes, and its own page shows its profile", async ({ page }) => {
    await page.goto(RISTRETTO);
    await expect(
      page
        .getByRole("list", { name: "Tadımlar" })
        .getByText("Tat notaları: bitter çikolata, kakao, tütsülü"),
    ).toBeVisible();

    await openTastingOf(page, RISTRETTO);
    // Five dots and a word for every dimension, each row named in words.
    await expect(profileRows(page)).toHaveCount(5);
    await expect(page.getByRole("img", { name: "Gövde: 5/5, yoğun" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Asidite: 2/5, yumuşak" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Acılık: 4/5, çok" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Bitiş: 4/5, uzun" })).toBeVisible();
  });

  test("a dimension nobody rated is left out", async ({ page }) => {
    await openTastingOf(page, "/kahve/kronotrop/wilder-jungle");
    await expect(profileRows(page)).toHaveCount(3);
    await expect(page.getByRole("img", { name: "Gövde: 2/5, hafif" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Tatlılık:/ })).toHaveCount(0);

    await openTastingOf(page, "/kahve/kronotrop/original-taste");
    await expect(profileRows(page)).toHaveCount(1);
  });

  test("a coffee's page averages the profiles and counts the notes, each with its n", async ({
    page,
  }) => {
    await page.goto(RISTRETTO);
    await expect(page.getByRole("heading", { name: /Tat profili/ })).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Gövde: ortalama 5,0/5, yoğun (1 tadım)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Asidite: ortalama 2,0/5, yumuşak (1 tadım)" }),
    ).toBeVisible();

    const tags = page.getByRole("table", { name: "Tat notaları ve kaç tadımda geçtikleri" });
    await expect(tags.getByRole("row")).toHaveCount(3);
    await expect(tags.getByRole("row").first()).toContainText("bitter çikolata");
    await expect(tags.getByRole("row").first()).toContainText("1 tadım");

    // A coffee nobody has profiled or tagged shows neither section.
    await page.goto("/kahve/jacobs/classico-lungo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classico Lungo");
    await expect(page.getByRole("heading", { name: /Tat profili/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Öne çıkan tatlar/ })).toHaveCount(0);
  });

  test("a member's page sums up their palate", async ({ page }) => {
    await openTastingOf(page, RISTRETTO);
    await page.getByRole("main").getByRole("link", { name: /^@/ }).click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    await expect(page.getByRole("heading", { name: /Damak/ })).toBeVisible();
    // Seven sample tastings rate the body; fewer rate the other dimensions.
    await expect(
      page.getByRole("img", { name: "Gövde: ortalama 3,3/5, orta (7 tadım)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Asidite: ortalama 3,0/5, dengeli (6 tadım)" }),
    ).toBeVisible();
    const tags = page.getByRole("table", { name: /tat notaları ve kaç tadımda geçtikleri/ });
    await expect(tags.getByRole("row").first()).toContainText("meyvemsi");
    await expect(tags.getByRole("row").first()).toContainText("2 tadım");
  });
});

test.describe("lists", () => {
  test("a member's public list is linked from their page and shows its coffees in order", async ({
    page,
    request,
  }) => {
    await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
    await page.getByRole("list", { name: "Tadımlar" }).getByRole("link").first().click();
    await page.getByRole("main").getByRole("link", { name: /^@/ }).click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    const lists = page.getByRole("list", { name: "Listeler" });
    await expect(lists.getByRole("listitem")).toHaveCount(1);
    await expect(lists).toContainText("3 kahve");
    await lists.getByRole("link", { name: /Sabah için kapsüller/ }).click();

    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+\/liste\/sabah-icin-kapsuller$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sabah için kapsüller");
    await expect(page.getByText("Güne başlarken elimin gittiği kapsüller")).toBeVisible();
    const coffees = page.getByRole("list", { name: "Listedeki kahveler" }).getByRole("listitem");
    await expect(coffees).toHaveCount(3);
    await expect(coffees.nth(0)).toContainText("Ristretto (Siyah Kapsül)");
    await expect(coffees.nth(0)).toContainText("Kısa ve net; uyandırır.");
    await expect(coffees.nth(1)).toContainText("Explore Colombia");
    await expect(coffees.nth(2)).toContainText("Colombia");
    // Each entry leads to the coffee, with the community's score beside it.
    await expect(coffees.nth(0).getByRole("img", { name: "Puan: 9 / 10" })).toBeVisible();
    await expect(
      coffees.nth(0).getByRole("link", { name: "Ristretto (Siyah Kapsül)" }),
    ).toHaveAttribute("href", "/kahve/nespresso/ristretto-siyah-kapsul");
    // Reporting needs an account.
    await expect(page.getByRole("button", { name: "Şikâyet et" })).toHaveCount(0);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/\/u\/[a-z0-9_]+\/liste\/sabah-icin-kapsuller<\/loc>/);
  });

  test("a list that does not exist is a 404", async ({ page }) => {
    const response = await page.goto("/u/owner/liste/boyle-bir-liste-yok");
    expect(response?.status()).toBe(404);
  });

  test("a coffee's page offers visitors the login for its two buttons", async ({ page }) => {
    await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "Denemek istiyorum" })).toHaveAttribute(
      "href",
      "/giris",
    );
    await expect(main.getByRole("link", { name: "Listeye ekle" })).toHaveAttribute(
      "href",
      "/giris",
    );
  });
});

test.describe("cafés", () => {
  const cafeList = (page: Page) => page.getByRole("list", { name: "Kafeler" });

  test("are listed apart from the coffees and filtered by city and name", async ({ page }) => {
    await page.goto("/");
    await exploreNav(page).getByRole("link", { name: "Kafeler" }).click();
    await expect(page).toHaveURL(/\/kafeler$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kafeler");
    await expect(cafeList(page).getByRole("listitem")).toHaveCount(2);
    // The busiest first, with its visits and average.
    const first = cafeList(page).getByRole("listitem").first();
    await expect(first).toContainText("Örnek Kahve Atölyesi");
    await expect(first).toContainText("Kadıköy, İstanbul");
    await expect(first).toContainText("3 ziyaret");
    await expect(first.getByRole("img", { name: "Puan: 8 / 10" })).toBeVisible();

    await page.getByLabel("Şehir").selectOption({ label: "İzmir" });
    await expect(page).toHaveURL(/sehir=izmir/);
    await expect(cafeList(page).getByRole("listitem")).toHaveCount(1);
    await expect(cafeList(page)).toContainText("Liman Kahvecisi");

    await page.getByRole("button", { name: "Filtreleri temizle" }).click();
    await expect(page).toHaveURL(/\/kafeler$/);
    await page.getByRole("searchbox", { name: "Ara" }).fill("KADIKÖY");
    await expect(cafeList(page).getByRole("listitem")).toHaveCount(1);
    await expect(page.getByRole("status")).toContainText("2 kafeden 1 tanesi");
    // A café's numbers are not the coffees': the coffee list is unchanged.
    await page.goto("/kahveler");
    await expect(page.getByRole("status")).toContainText("20 kahve");
  });

  test("a café's page shows its visits and an average per drink, each with its n", async ({
    page,
  }) => {
    await page.goto("/kafeler");
    await cafeList(page)
      .getByRole("link", { name: /Örnek Kahve Atölyesi/ })
      .click();
    await expect(page).toHaveURL(/\/kafe\/istanbul\/ornek-kahve-atolyesi$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Örnek Kahve Atölyesi");
    await expect(page.getByRole("img", { name: "Puan: 8 / 10" }).first()).toBeVisible();

    const visits = page.getByRole("list", { name: "Ziyaretler" }).getByRole("listitem");
    await expect(visits).toHaveCount(3);
    // Newest visit first, each with who and what.
    await expect(visits.nth(0)).toContainText("Espresso");
    await expect(visits.nth(1)).toContainText("Filtre kahve · Etiyopya V60");
    await expect(visits.nth(1)).toContainText("Çiçeksi, temiz bitiş.");
    await expect(visits.nth(1).getByRole("link", { name: /^@/ })).toBeVisible();

    // Three drinks, one visit each: every row says n = 1 and is marked as a small sample.
    const drinks = page.getByRole("table", { name: /içecek türüne göre ortalama puan/ }).first();
    await expect(drinks.getByRole("row")).toHaveCount(4);
    await expect(drinks.getByRole("row", { name: /Filtre kahve/ })).toContainText("Az tadım");
    // Visitors are sent to the login to add their own visit.
    await expect(page.getByRole("link", { name: "Burada ne içtin?" })).toHaveAttribute(
      "href",
      /\/panel\/kafe\/yeni\/[0-9a-f-]{36}$/,
    );
    await expect(page.getByRole("button", { name: "Şikâyet et" })).toHaveCount(0);
  });

  test("the feed has a tab for café visits, and a member's page lists theirs", async ({ page }) => {
    await page.goto("/akis");
    await page.getByRole("tab", { name: "Kafeler" }).click();
    await expect(page).toHaveURL(/sekme=kafeler/);
    const visits = page.getByRole("list", { name: "Kafeler" }).getByRole("listitem");
    await expect(visits).toHaveCount(4);
    await expect(visits.first()).toContainText(/Örnek Kahve Atölyesi|Liman Kahvecisi/);

    await visits.first().getByRole("link", { name: /^@/ }).click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    await expect(
      page.getByRole("list", { name: "Kafe ziyaretleri" }).getByRole("listitem"),
    ).toHaveCount(4);
  });

  test("a café that does not exist is a 404", async ({ page }) => {
    const response = await page.goto("/kafe/istanbul/boyle-bir-kafe-yok");
    expect(response?.status()).toBe(404);
  });
});

test.describe("a tasting's own page", () => {
  test("is reached from the counts under a tasting and invites visitors to sign in", async ({
    page,
  }) => {
    await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
    await page
      .getByRole("list", { name: "Tadımlar" })
      .getByRole("link", { name: /0 beğeni · 0 yorum/ })
      .click();
    await expect(page).toHaveURL(/\/tadim\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ristretto (Siyah Kapsül)");
    // (The page that was left stays in the document, hidden: ask for what is on screen.)
    await expect(page.getByText("Çok yoğun, kısa ve net.").filter({ visible: true })).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Puan: 9 / 10" }).filter({ visible: true }),
    ).toBeVisible();

    // Liking and commenting need an account; reporting is not offered to visitors.
    await expect(page.getByRole("link", { name: "Beğen", exact: true })).toHaveAttribute(
      "href",
      "/giris",
    );
    await expect(page.getByRole("heading", { name: /Yorumlar/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Şikâyet et" })).toHaveCount(0);
    // One person's note is not offered to search engines; the coffee's page is.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("does not exist for an unknown id", async ({ page }) => {
    const response = await page.goto("/tadim/00000000-0000-4000-8000-000000000000");
    expect(response?.status()).toBe(404);
  });
});

test.describe("workshop", () => {
  test("shows the next workshop, its program and a form that says what to fix", async ({
    page,
  }) => {
    await page.goto("/atolye");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kahveye giriş atölyesi");
    await expect(page.getByText("İki saatte üç demleme yöntemi ve bir mini tadım.")).toBeVisible();
    await expect(page.getByText("8 kişilik · 8 yer kaldı")).toBeVisible();
    await expect(page.getByText(/Konum, başvurun onaylanınca paylaşılır\./)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ne yapacağız?" })).toBeVisible();
    await expect(page.getByText("Demleme pratiği")).toBeVisible();
    await expect(page.getByText("60 dk")).toBeVisible();
    await expect(page.getByText("Ücretli mi?")).toBeVisible();

    // One way to the form on screen: the card's button, or on a phone the bar at the bottom.
    const toForm = page.getByRole("link", { name: "Başvur" }).filter({ visible: true });
    await expect(toForm).toHaveCount(1);
    await expect(toForm).toHaveAttribute("href", "#basvuru");

    // Checked on the server before anything is written: an empty form is refused field by
    // field, and the first field to fix gets the focus.
    await page.getByRole("button", { name: "Başvur" }).click();
    await expect(page.getByText("Adını yaz.")).toBeVisible();
    await expect(
      page.getByText("Bir telefon numarası ya da Instagram kullanıcı adı yaz."),
    ).toBeVisible();
    await expect(page.getByText("Devam etmek için onay kutusunu işaretle.")).toBeVisible();
    await expect(page.getByLabel("Adın")).toBeFocused();
    await expect(page.getByLabel("Adın")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("articles", () => {
  test("the info page lists the articles, each with its own page", async ({ page }) => {
    await page.goto("/");
    await mainNav(page).getByRole("link", { name: "Bilgi" }).click();
    await expect(page).toHaveURL(/\/bilgi$/);
    const articles = page.getByRole("list", { name: "Yazılar" }).getByRole("listitem");
    await expect(articles).toHaveCount(4);
    await expect(articles.first()).toContainText("Arabica ile Robusta arasındaki fark ne?");
    await expect(articles.first()).toContainText("2 dakikalık okuma");

    await articles
      .first()
      .getByRole("link", { name: /Devamını oku/ })
      .click();
    await expect(page).toHaveURL(/\/bilgi\/arabica-robusta$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Arabica ile Robusta arasındaki fark ne?",
    );
    await expect(page.getByText(/%100 Arabica/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Bütün yazılar" })).toHaveAttribute(
      "href",
      "/bilgi",
    );
  });

  test("an article that does not exist is a 404", async ({ page }) => {
    const response = await page.goto("/bilgi/boyle-bir-yazi-yok");
    expect(response?.status()).toBe(404);
  });
});
