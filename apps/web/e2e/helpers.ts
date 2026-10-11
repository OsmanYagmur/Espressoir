/**
 * Shared by the signed-in specs: the test accounts (from the environment, never
 * hard-coded), signing in through the real form, and reading the mail catcher that the
 * local Supabase stack delivers every e-mail to.
 */
import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type Account = { email?: string; password?: string };

export const owner: Account = {
  email: process.env.E2E_OWNER_EMAIL,
  password: process.env.E2E_OWNER_PASSWORD,
};
export const guest: Account = {
  email: process.env.E2E_GUEST_EMAIL,
  password: process.env.E2E_GUEST_PASSWORD,
};
export const configured = Boolean(owner.email && owner.password && guest.email && guest.password);

// The public API settings, sent the way supabase-js sends them.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const apiHeaders = { apikey: key, Authorization: `Bearer ${key}` };

const mailUrl = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:54324";

/** The submit button unlocks once the CAPTCHA has passed, which takes a moment. */
async function press(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  await button.click();
}

export async function submitPassword(page: Page, account: Account) {
  await page.goto("/giris");
  await page.getByRole("button", { name: "Parolayla giriş yap" }).click();
  await page.getByLabel("E-posta", { exact: true }).fill(account.email ?? "");
  await page.getByLabel("Parola", { exact: true }).fill(account.password ?? "");
  await press(page, "Giriş yap");
}

/** Logs in and waits for the panel: navigating away earlier would race the session cookie. */
export async function signIn(page: Page, account: Account) {
  await submitPassword(page, account);
  await expect(page).toHaveURL(/\/panel$/);
}

/** Asks for a sign-in code the way a visitor does. Returns when the form says it was sent. */
export async function requestCode(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await press(page, "Giriş kodu gönder");
  await expect(page.getByText(`${email} adresine kayıtlı bir hesap varsa`)).toBeVisible();
}

export async function enterCode(page: Page, code: string) {
  await page.getByLabel("Giriş kodu", { exact: true }).fill(code);
  await press(page, "Giriş yap");
}

export interface Mail {
  subject: string;
  /** The sign-in code (six digits in the local stack), when the e-mail carries one. */
  code: string | null;
  /** The sign-in or invitation link. */
  link: string | null;
}

interface MailSummary {
  ID: string;
  Created: string;
}

/**
 * The newest e-mail to an address that arrived after `since`. Waits for it: the auth
 * server sends in the background.
 */
export async function waitForMail(
  request: APIRequestContext,
  to: string,
  since: number,
): Promise<Mail> {
  let id = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailUrl}/api/v1/search`, {
          params: { query: `to:"${to}"` },
        });
        const { messages } = (await response.json()) as { messages: MailSummary[] };
        // A second of slack: the two clocks are the same machine, but not the same tick.
        const fresh = messages.find((mail) => Date.parse(mail.Created) >= since - 1000);
        id = fresh?.ID ?? "";
        return id;
      },
      { timeout: 20_000, message: `no e-mail arrived for ${to}` },
    )
    .not.toBe("");

  const response = await request.get(`${mailUrl}/api/v1/message/${id}`);
  const mail = (await response.json()) as { Subject: string; Text: string; HTML: string };
  const link = /href="([^"]*token_hash=[^"]*)"/.exec(mail.HTML)?.[1]?.replaceAll("&amp;", "&");
  return {
    subject: mail.Subject,
    code: /\b(\d{6,10})\b/.exec(`${mail.Subject}\n${mail.Text}`)?.[1] ?? null,
    link: link ?? null,
  };
}

/** How many e-mails an address has received in total. */
export async function mailCount(request: APIRequestContext, to: string): Promise<number> {
  const response = await request.get(`${mailUrl}/api/v1/search`, {
    params: { query: `to:"${to}"` },
  });
  return ((await response.json()) as { messages: MailSummary[] }).messages.length;
}
