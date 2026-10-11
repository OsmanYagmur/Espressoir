/**
 * Prepares a throwaway Supabase (the CI stack, or a dev project) for the end-to-end
 * tests: makes sure a second, non-admin account exists, so tests can check that one user
 * cannot edit another's tastings. Refuses to run against prod.
 *
 *   E2E_GUEST_EMAIL=… E2E_GUEST_PASSWORD=… tsx scripts/e2e-setup.ts
 */
import type { Database } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";

import { assertTarget, loadTargetEnv, requireEnv } from "./lib/target-env";

const GUEST_USERNAME = "e2e_guest";

loadTargetEnv("dev");
await assertTarget("dev", requireEnv("SUPABASE_DB_URL"));

const supabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const existing = await supabase
  .from("profiles")
  .select("id")
  .eq("username", GUEST_USERNAME)
  .maybeSingle();
if (existing.error) throw new Error(existing.error.message);

if (existing.data) {
  console.log(`@${GUEST_USERNAME} zaten var.`);
} else {
  const created = await supabase.auth.admin.createUser({
    email: requireEnv("E2E_GUEST_EMAIL"),
    password: requireEnv("E2E_GUEST_PASSWORD"),
    email_confirm: true,
    user_metadata: { username: GUEST_USERNAME },
  });
  if (created.error) throw new Error(created.error.message);
  console.log(`✓ @${GUEST_USERNAME} oluşturuldu.`);
}

// An ordinary member who has finished onboarding (new accounts start without it).
const onboarded = await supabase
  .from("profiles")
  .update({ onboarded_at: new Date().toISOString() })
  .eq("username", GUEST_USERNAME)
  .is("onboarded_at", null);
if (onboarded.error) throw new Error(onboarded.error.message);
