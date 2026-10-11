/**
 * Invites people while signup is closed: Supabase e-mails each address a link that opens
 * their account, and they pick a username on the first visit.
 *
 *   pnpm user:invite ada@example.com [more addresses…]      dev project
 *   pnpm user:invite --env prod ada@example.com             prod (asks for the project ref)
 *
 * Options: --site <url>   where the link leads; default: NEXT_PUBLIC_SITE_URL from the env
 *                         file, else the live site (prod) or http://localhost:3000 (dev).
 *                         The address must be on the project's list of redirect URLs.
 *
 * Needs an e-mail service that can reach the address: Supabase's built-in one only writes
 * to members of the project's own team (docs/setup-auth.md).
 */
import { siteConfig } from "@espressoir/core";
import type { Database } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";

import {
  assertTarget,
  loadTargetEnv,
  parseTargetEnv,
  projectRefFromDbUrl,
  requireEnv,
} from "./lib/target-env";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CALLBACK_PATH = "/auth/callback";

/** Splits the command line into the flags this script knows and the addresses. */
function parseArgs(argv: readonly string[]): { site?: string; emails: string[] } {
  const emails: string[] = [];
  let site: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--env") i += 1;
    else if (arg === "--site") site = argv[(i += 1)];
    else if (arg.startsWith("--")) throw new Error(`Bilinmeyen seçenek: ${arg}`);
    else emails.push(arg.trim().toLowerCase());
  }
  return { site, emails: [...new Set(emails)] };
}

async function main(): Promise<void> {
  const target = parseTargetEnv();
  const { site, emails } = parseArgs(process.argv.slice(2));
  if (emails.length === 0) {
    throw new Error("Kullanım: pnpm user:invite [--env prod] [--site <url>] <e-posta> […]");
  }
  const malformed = emails.filter((email) => !EMAIL_SHAPE.test(email));
  if (malformed.length > 0) {
    throw new Error(`Geçerli bir e-posta adresi değil: ${malformed.join(", ")}`);
  }

  loadTargetEnv(target);
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  // The API URL and the database URL must be the same project.
  const ref = projectRefFromDbUrl(dbUrl);
  if (ref && !new URL(url).hostname.startsWith(`${ref}.`)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ile SUPABASE_DB_URL farklı projeleri gösteriyor.");
  }

  const siteUrl = new URL(
    site ??
      (process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        (target === "prod" ? siteConfig.url : "http://localhost:3000")),
  );
  const redirectTo = new URL(CALLBACK_PATH, siteUrl).toString();
  console.log(`Davet bağlantıları şuraya götürecek: ${redirectTo}`);
  await assertTarget(target, dbUrl);

  const supabase = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let failed = 0;
  for (const email of emails) {
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) {
      failed += 1;
      const reason =
        error.code === "email_exists"
          ? "bu adresle zaten bir hesap var"
          : error.code === "email_address_not_authorized"
            ? "e-posta servisi bu adrese gönderemiyor (özel SMTP gerekli: docs/setup-auth.md)"
            : error.message;
      console.error(`✗ ${email}: ${reason}`);
    } else {
      console.log(`✓ ${email}: davet gönderildi`);
    }
  }

  console.log(
    `\n${emails.length - failed} davet gönderildi, ${failed} başarısız — hedef: ${target}.`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
