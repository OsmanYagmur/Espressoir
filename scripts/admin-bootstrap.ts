/**
 * Creates the owner's account (signup is closed, so this is the only way in) and makes it
 * an admin. Safe to run again: an existing account is only checked, never changed.
 *
 *   pnpm admin:bootstrap              dev project
 *   pnpm admin:bootstrap --env prod   prod project (asks for the project ref)
 *
 * Reads OWNER_USERNAME and OWNER_EMAIL from the env file and asks for the password, which
 * is sent straight to Supabase Auth and never written anywhere. (CI passes OWNER_PASSWORD.)
 */
import type { Database } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";

import {
  assertTarget,
  loadTargetEnv,
  parseTargetEnv,
  projectRefFromDbUrl,
  requireEnv,
} from "./lib/target-env";

const MIN_PASSWORD_LENGTH = 10;

/** Reads a line without echoing it. */
function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    throw new Error("Parola sorulamıyor (etkileşimli terminal yok). OWNER_PASSWORD tanımla.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const done = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          done();
          return resolve(value);
        }
        if (ch === "\u0003") {
          done();
          return reject(new Error("İptal edildi."));
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function askPassword(): Promise<string> {
  const fromEnv = process.env.OWNER_PASSWORD;
  if (fromEnv) return fromEnv;
  const first = await promptHidden(`Parola (en az ${MIN_PASSWORD_LENGTH} karakter): `);
  const second = await promptHidden("Parola (tekrar): ");
  if (first !== second) throw new Error("Parolalar aynı değil.");
  return first;
}

async function main(): Promise<void> {
  const target = parseTargetEnv();
  loadTargetEnv(target);
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  await assertTarget(target, dbUrl);

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const username = requireEnv("OWNER_USERNAME");
  const email = requireEnv("OWNER_EMAIL");
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new Error("OWNER_USERNAME 3–24 karakter olmalı; yalnızca a–z, 0–9 ve _ içerebilir.");
  }
  // The API URL and the database URL must be the same project.
  const ref = projectRefFromDbUrl(dbUrl);
  if (ref && !new URL(url).hostname.startsWith(`${ref}.`)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ile SUPABASE_DB_URL farklı projeleri gösteriyor.");
  }

  const supabase = createClient<Database>(url, requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await supabase
    .from("profiles")
    .select("id, role")
    .eq("username", username)
    .maybeSingle();
  if (existing.error) throw new Error(`Profil okunamadı: ${existing.error.message}`);

  let userId = existing.data?.id;
  if (userId) {
    console.log(`@${username} zaten var; parola ve e-posta değiştirilmedi.`);
  } else {
    const password = await askPassword();
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Parola en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
    }
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (created.error) throw new Error(`Hesap oluşturulamadı: ${created.error.message}`);
    userId = created.data.user.id;
    console.log(`Hesap oluşturuldu: ${email}`);
  }

  // The signup trigger made the profile; make sure it carries the right name and role.
  const updated = await supabase
    .from("profiles")
    .update({ username, role: "admin" })
    .eq("id", userId)
    .select("username, role")
    .single();
  if (updated.error) throw new Error(`Profil güncellenemedi: ${updated.error.message}`);

  // The owner's name is chosen here, so there is no onboarding step to send them through.
  const onboarded = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId)
    .is("onboarded_at", null);
  if (onboarded.error) throw new Error(`Profil güncellenemedi: ${onboarded.error.message}`);

  console.log(`✓ @${updated.data.username} (${updated.data.role}) hazır — hedef: ${target}.`);
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
