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

test("the look can be switched to the tasting form, is remembered, and switches back", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  const lead = page.getByText(/^Espressoir bir kahve tadım defteri\./);
  const steps = page.getByRole("heading", { name: "Nasıl çalışır" });

  // Sade is what a first visit gets: the page says what it is and where to start.
  await expect(html).toHaveAttribute("data-look", "sade");
  await expect(lead).toBeVisible();
  await expect(steps).toBeAttached();
  await expect(
    page.getByRole("main").getByRole("link", { name: /Kahvelere göz at/ }),
  ).toBeVisible();

  await page.getByTestId("theme-toggle").click();
  await page.getByRole("menuitemradio", { name: "Tadım formu" }).click();
  await expect(html).toHaveAttribute("data-look", "form");
  await expect(lead).toBeHidden();
  await expect(page.getByText("V60 · filtre · kapsül", { exact: false })).toBeVisible();
  await expect(page.getByRole("menu")).toBeHidden();

  // The choice belongs to the browser: it is there again after a reload, on any page.
  await page.goto("/kahveler");
  await expect(html).toHaveAttribute("data-look", "form");
  await expect(page.getByText(/^Katalogdaki bütün kahveler\./)).toBeHidden();

  await page.getByTestId("theme-toggle").click();
  await expect(page.getByRole("menuitemradio", { name: "Tadım formu" })).toBeChecked();
  await page.getByRole("menuitemradio", { name: "Sade" }).click();
  await expect(html).toHaveAttribute("data-look", "sade");
  await expect(page.getByText(/^Katalogdaki bütün kahveler\./)).toBeVisible();
});

test("no page is wider than a phone's screen", async ({ page }) => {
  for (const path of [
    "/",
    "/kahveler",
    "/akis",
    "/istatistik",
    "/kahve/nespresso/ristretto-siyah-kapsul",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
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

test.describe("members and legal texts", () => {
  test("a member's notebook is a public page listed in the sitemap", async ({ page, request }) => {
    // The archive's owner is the one member of the sample data; the sitemap knows the name.
    const sitemap = await (await request.get("/sitemap.xml")).text();
    const path = /<loc>[^<]*(\/u\/[a-z0-9_]+)<\/loc>/.exec(sitemap)?.[1];
    expect(path).toBeTruthy();

    await page.goto(path!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`@${path!.slice(3)}.`);
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
      ["KVKK", "KVKK aydınlatma metni."],
      ["Gizlilik", "Gizlilik politikası."],
      ["Koşullar", "Kullanım koşulları."],
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Giriş.");
    // (Each look prints this sentence in its own place; one of the two is on screen.)
    await expect(
      page.getByText(/Kayıt şimdilik davetle\./).filter({ visible: true }),
    ).toBeVisible();
  });
});

test.describe("community", () => {
  test("the feed lists the latest entries with who wrote them", async ({ page }) => {
    await page.goto("/");
    await mainNav(page).getByRole("link", { name: "Akış" }).click();
    await expect(page).toHaveURL(/\/akis$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akış.");

    // The first ten of the 17 logged tastings come with the page; the rest is on request.
    const entries = page.getByRole("list", { name: "Herkes" }).getByRole("listitem");
    await expect(entries).toHaveCount(10);
    await expect(entries.first().getByRole("link", { name: /^@/ })).toBeVisible();
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
    const author = page
      .getByRole("list", { name: "Tadımlar" })
      .getByRole("link", { name: /^@/ })
      .first();
    await author.click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    await expect(page.getByRole("list", { name: "Puan dağılımı" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Yönteme göre/ })).toBeVisible();
    // Visitors are offered the login instead of a follow that cannot work.
    await expect(page.getByRole("link", { name: "Takip et" })).toHaveAttribute("href", "/giris");
  });
});

test.describe("taste profile and flavour tags", () => {
  const RISTRETTO = "/kahve/nespresso/ristretto-siyah-kapsul";
  /** Follows the counts under the first tasting of a coffee to that tasting's own page. */
  async function openTastingOf(page: Page, coffeePage: string) {
    await page.goto(coffeePage);
    await page
      .getByRole("list", { name: "Tadımlar" })
      .getByRole("link", { name: /beğeni · \d+ yorum/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/tadim\/[0-9a-f-]{36}$/);
  }

  test("a tasting carries its tags, and its own page draws its profile", async ({ page }) => {
    await page.goto(RISTRETTO);
    await expect(
      page
        .getByRole("list", { name: "Tadımlar" })
        .getByText("Tat etiketleri: Bitter Çikolata, Kakao, Tütsülü"),
    ).toBeVisible();

    await openTastingOf(page, RISTRETTO);
    // Every corner is named and valued in words: the chart is never the only carrier.
    await expect(
      page.getByRole("img", {
        name: "Tat profili grafiği: Gövde 5/5, Asidite 2/5, Acılık 4/5, Tatlılık 2/5, Bitiş 4/5",
      }),
    ).toBeVisible();
    await page.getByText("Tablo olarak göster").filter({ visible: true }).click();
    const twin = page.getByRole("table", {
      name: "Ristretto (Siyah Kapsül) tadımının tat puanları",
    });
    await expect(twin.getByRole("row").nth(1)).toContainText("Gövde");
    await expect(twin.getByRole("row").nth(1)).toContainText("5/5");
  });

  test("a corner nobody rated stays empty, and too few corners make a list instead", async ({
    page,
  }) => {
    await openTastingOf(page, "/kahve/kronotrop/wilder-jungle");
    await expect(
      page.getByRole("img", {
        name: "Tat profili grafiği: Gövde 2/5, Asidite 4/5, Acılık —, Tatlılık —, Bitiş 3/5",
      }),
    ).toBeVisible();

    await openTastingOf(page, "/kahve/kronotrop/original-taste");
    const profile = page.getByRole("region", { name: "Tat profili" });
    await expect(profile.getByRole("definition")).toHaveText("3/5");
    await expect(page.getByRole("img", { name: /Tat profili grafiği/ })).toHaveCount(0);
  });

  test("a coffee's page averages the profiles and counts the tags, each with its n", async ({
    page,
  }) => {
    await page.goto(RISTRETTO);
    await expect(page.getByRole("heading", { name: /Tat profili/ })).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: /^Tat profili grafiği: Gövde 5,0 \(n = 1\), Asidite 2,0 \(n = 1\)/,
      }),
    ).toBeVisible();
    // One tasting is not much to go on, and the page says so in words.
    await expect(page.getByText(/üçten az tadıma dayanıyor/)).toBeVisible();

    const tags = page.getByRole("table", { name: "Tat etiketleri ve kaç tadımda geçtikleri" });
    await expect(tags.getByRole("row")).toHaveCount(3);
    await expect(tags.getByRole("row").first()).toContainText("Bitter Çikolata");
    await expect(tags.getByRole("row").first()).toContainText("1 tadım");

    // A coffee nobody has profiled or tagged shows neither section.
    await page.goto("/kahve/jacobs/classico-lungo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Classico Lungo.");
    await expect(page.getByRole("heading", { name: /Tat profili/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Öne çıkan tatlar/ })).toHaveCount(0);
  });

  test("a member's page sums up their palate", async ({ page }) => {
    await page.goto(RISTRETTO);
    await page
      .getByRole("list", { name: "Tadımlar" })
      .getByRole("link", { name: /^@/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    await expect(page.getByRole("heading", { name: /Damak/ })).toBeVisible();
    // Seven sample tastings rate the body; fewer rate the other corners.
    await expect(
      page.getByRole("img", { name: /Gövde 3,3 \(n = 7\), Asidite 3,0 \(n = 6\)/ }),
    ).toBeVisible();
    const tags = page.getByRole("table", { name: /tat etiketleri ve kaç tadımda geçtikleri/ });
    await expect(tags.getByRole("row").first()).toContainText("Meyvemsi");
    await expect(tags.getByRole("row").first()).toContainText("2 tadım");
  });
});

test.describe("lists", () => {
  test("a member's public list is linked from their page and shows its coffees in order", async ({
    page,
    request,
  }) => {
    await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
    await page
      .getByRole("list", { name: "Tadımlar" })
      .getByRole("link", { name: /^@/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+$/);
    const lists = page.getByRole("list", { name: "Listeler" });
    await expect(lists.getByRole("listitem")).toHaveCount(1);
    await expect(lists).toContainText("3 kahve");
    await lists.getByRole("link", { name: "Sabah için kapsüller" }).click();

    await expect(page).toHaveURL(/\/u\/[a-z0-9_]+\/liste\/sabah-icin-kapsuller$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sabah için kapsüller.");
    await expect(page.getByText("Güne başlarken elimin gittiği kapsüller")).toBeVisible();
    const coffees = page.getByRole("list", { name: "Listedeki kahveler" }).getByRole("listitem");
    await expect(coffees).toHaveCount(3);
    await expect(coffees.nth(0)).toContainText("Ristretto (Siyah Kapsül)");
    await expect(coffees.nth(0)).toContainText("Kısa ve net; uyandırır.");
    await expect(coffees.nth(1)).toContainText("Explore Colombia");
    await expect(coffees.nth(2)).toContainText("Colombia");
    // Each entry leads to the coffee, with the community's score beside it.
    await expect(coffees.nth(0).getByRole("img", { name: "10 üzerinden 9 puan" })).toBeVisible();
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

test.describe("a tasting's own page", () => {
  test("is reached from the counts under a tasting and invites visitors to sign in", async ({
    page,
  }) => {
    await page.goto("/kahve/nespresso/ristretto-siyah-kapsul");
    await page
      .getByRole("list", { name: "Tadımlar" })
      .getByRole("link", { name: "0 beğeni · 0 yorum" })
      .click();
    await expect(page).toHaveURL(/\/tadim\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ristretto (Siyah Kapsül).");
    // (The page that was left stays in the document, hidden: ask for what is on screen.)
    await expect(
      page.getByRole("list", { name: "Tadım", exact: true }).getByText("Çok yoğun, kısa ve net."),
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
