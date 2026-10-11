/**
 * Accounts: signing in with an e-mail code or link, joining by invitation, choosing a
 * username, the public profile, taking one's data along and leaving. Like panel.spec these
 * need the local Supabase stack, whose mail catcher receives every e-mail the auth server
 * sends.
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

import {
  configured,
  enterCode,
  guest,
  mailCount,
  requestCode,
  signIn,
  waitForMail,
} from "./helpers";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

test.skip(!configured, "needs a Supabase with test accounts (E2E_* variables)");
// One browser at a time: these tests write to the shared database.
test.describe.configure({ mode: "serial" });

/** Sends an invitation with the same command the owner uses. */
function invite(email: string, site: string) {
  execFileSync("pnpm", ["--silent", "user:invite", "--site", site, email], {
    cwd: repoRoot,
    env: process.env,
    stdio: "pipe",
  });
}

async function finishOnboarding(page: Page, username: string) {
  await expect(page).toHaveURL(/\/hesap\/kurulum$/);
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill(username);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Defterimi aç" }).click();
}

test("a member signs in with the code from the e-mail", async ({ page, request }) => {
  const since = Date.now();
  await requestCode(page, guest.email!);
  const mail = await waitForMail(request, guest.email!, since);
  expect(mail.subject).toContain("Espressoir giriş kodun");
  expect(mail.code).toMatch(/^\d{6}$/);

  // A wrong code is refused and the form stays where it is.
  await enterCode(page, mail.code === "000000" ? "111111" : "000000");
  await expect(page.getByText("Kod hatalı ya da süresi dolmuş. Yeni bir kod iste.")).toBeVisible();

  await enterCode(page, mail.code!);
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByText("@e2e_guest olarak giriş yapıldı")).toBeVisible();
});

test("the link in the e-mail signs in after one click, in any browser", async ({
  page,
  request,
  browser,
}) => {
  const since = Date.now();
  await requestCode(page, guest.email!);
  const { link } = await waitForMail(request, guest.email!, since);
  expect(link).toContain("/auth/callback?token_hash=");

  // Opened somewhere that has never seen the login form (a phone's mail app, say).
  const elsewhere = await browser.newContext();
  const other = await elsewhere.newPage();
  await other.goto(link!);
  // Arriving is not enough: a mail scanner that fetches the link must not use it up.
  await expect(other).toHaveURL(/\/auth\/confirm\?/);
  await other.getByRole("button", { name: "Girişi tamamla" }).click();
  await expect(other).toHaveURL(/\/panel$/);

  // The link worked once. Used again, it is refused.
  const third = await (await browser.newContext()).newPage();
  await third.goto(link!);
  await third.getByRole("button", { name: "Girişi tamamla" }).click();
  await expect(third.getByText("Bu bağlantı geçersiz ya da süresi dolmuş.")).toBeVisible();
  await elsewhere.close();
});

test("an unknown address gets the same answer as a member, and no e-mail", async ({
  page,
  request,
}) => {
  const stranger = `yabanci-${Date.now()}@example.test`;
  await requestCode(page, stranger);
  await expect(page.getByLabel("Giriş kodu", { exact: true })).toBeVisible();
  // Give a wrongly sent e-mail time to arrive before concluding there is none.
  await page.waitForTimeout(2000);
  expect(await mailCount(request, stranger)).toBe(0);
});

test("an invited person joins, picks a name, gets a profile, takes their data and leaves", async ({
  page,
  request,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  const email = `davetli-${stamp}@example.test`;
  const username = `davetli_${stamp}`;

  // Invitation → one click → the onboarding step.
  const since = Date.now();
  invite(email, baseURL!);
  const mail = await waitForMail(request, email, since);
  expect(mail.subject).toBe("Espressoir'a davetlisin");
  await page.goto(mail.link!);
  await page.getByRole("button", { name: "Girişi tamamla" }).click();
  await expect(page).toHaveURL(/\/hesap\/kurulum$/);
  // Nothing else in the signed-in area opens before a name is chosen.
  await page.goto("/panel/tadim/yeni");
  await expect(page).toHaveURL(/\/hesap\/kurulum$/);

  // Names that belong to the site or to someone else are refused, with what was typed kept.
  await finishOnboarding(page, "Admin");
  await expect(page.getByText("Bu ad kullanılamıyor. Başka bir ad seç.")).toBeVisible();
  await finishOnboarding(page, "e2e_guest");
  await expect(page.getByText("Bu ad alınmış. Başka bir ad seç.")).toBeVisible();
  await expect(page.getByLabel("Kullanıcı adı", { exact: true })).toHaveValue("e2e_guest");

  await finishOnboarding(page, username);
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByText(`@${username} olarak giriş yapıldı`)).toBeVisible();

  // The profile exists right away, empty.
  await page.getByRole("link", { name: "Profilim" }).click();
  await expect(page).toHaveURL(new RegExp(`/u/${username}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`@${username}.`);
  await expect(page.getByText("Bu defterde henüz herkese açık tadım yok.")).toBeVisible();

  // Editing the profile shows on the public page without waiting for the hourly refresh.
  await page.goto("/hesap");
  await page.getByLabel("Görünen ad", { exact: true }).fill("Davetli Üye");
  await page.getByLabel("Hakkında", { exact: true }).fill("V60 ve Türk kahvesi.");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Kaydedildi.")).toBeVisible();
  await page.goto(`/u/${username}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Davetli Üye.");
  await expect(page.getByText("V60 ve Türk kahvesi.")).toBeVisible();

  // A second name change has to wait.
  await page.goto("/hesap");
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill(`${username}_2`);
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Kaydedildi.")).toBeVisible();
  await page.getByLabel("Kullanıcı adı", { exact: true }).fill(`${username}_3`);
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(
    page.getByText(/Kullanıcı adını en erken .* tarihinde değiştirebilirsin\./),
  ).toBeVisible();

  // Their data, as a file.
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Verilerimi indir" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^espressoir-verilerim-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await readFile(await download.path(), "utf8")) as {
    account: { email: string };
    profile: { username: string; display_name: string };
    account_state: { terms_version: string };
    tastings: unknown[];
  };
  expect(exported.account.email).toBe(email);
  expect(exported.profile).toMatchObject({
    username: `${username}_2`,
    display_name: "Davetli Üye",
  });
  expect(exported.account_state.terms_version).toBeTruthy();
  expect(exported.tastings).toEqual([]);

  // Leaving: the wrong name does nothing, the right one removes the account.
  const confirm = page.getByLabel("Onaylamak için kullanıcı adını yaz", { exact: true });
  await confirm.fill("baskasi");
  await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
  await expect(page.getByText("Yazdığın ad kullanıcı adınla eşleşmiyor.")).toBeVisible();
  await confirm.fill(`${username}_2`);
  await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/panel");
  await expect(page).toHaveURL(/\/giris$/);
  const gone = await page.goto(`/u/${username}_2`);
  expect(gone?.status()).toBe(404);
});

test("an invitation that ran out is replaced by inviting again", async ({
  page,
  request,
  baseURL,
}) => {
  const stamp = Date.now().toString(36);
  const email = `gec-${stamp}@example.test`;
  invite(email, baseURL!);
  const first = await waitForMail(request, email, Date.now() - 5000);

  // Until the invitation is accepted there is no account: asking for a sign-in code gets
  // the usual answer and no e-mail (signup is closed).
  await requestCode(page, email);
  await page.waitForTimeout(2000);
  expect(await mailCount(request, email)).toBe(1);

  // Inviting the same address again sends a fresh link, and the old one stops working.
  const since = Date.now();
  invite(email, baseURL!);
  const second = await waitForMail(request, email, since);
  expect(second.link).not.toBe(first.link);

  await page.goto(first.link!);
  await page.getByRole("button", { name: "Girişi tamamla" }).click();
  await expect(page.getByText("Bu davet bağlantısı geçersiz ya da süresi dolmuş.")).toBeVisible();

  await page.goto(second.link!);
  await page.getByRole("button", { name: "Girişi tamamla" }).click();
  await finishOnboarding(page, `gec_${stamp}`);
  await expect(page).toHaveURL(/\/panel$/);
});

test("an admin cannot delete their own account from the site", async ({ page }) => {
  await signIn(page, {
    email: process.env.E2E_OWNER_EMAIL,
    password: process.env.E2E_OWNER_PASSWORD,
  });
  await page.goto("/hesap");
  await page
    .getByLabel("Onaylamak için kullanıcı adını yaz", { exact: true })
    .fill(process.env.OWNER_USERNAME ?? "owner");
  await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
  await expect(page.getByText("Yönetici hesabı buradan silinemez.")).toBeVisible();
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/panel$/);
});
