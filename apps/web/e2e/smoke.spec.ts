import { expect, test } from "@playwright/test";

test("home page introduces the notebook for every brew method", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Espressoir/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Her fincanın bir hatırası var.",
  );
  await expect(page.getByText("Türk kahvesi", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "10 üzerinden 8 puan" })).toBeVisible();
});

test("main navigation reaches the coffee list", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Ana menü" })
    .locator("visible=true")
    .getByRole("link", { name: "Kahveler" })
    .click();
  await expect(page).toHaveURL(/\/kahveler$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kahveler");
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
