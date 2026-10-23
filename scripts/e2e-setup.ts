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

// The workshop pages need a workshop that takes applications. The one the migration adds
// has a fixed date: once that has passed, it moves two weeks ahead (same hours).
const DAY = 24 * 60 * 60 * 1000;
const workshops = await supabase.from("workshops").select("id, starts_at, ends_at");
if (workshops.error) throw new Error(workshops.error.message);
for (const workshop of workshops.data) {
  const start = Date.parse(workshop.starts_at);
  if (start > Date.now()) continue;
  const shift = Math.ceil((Date.now() - start) / DAY + 14) * DAY;
  const moved = await supabase
    .from("workshops")
    .update({
      starts_at: new Date(start + shift).toISOString(),
      ends_at: new Date(Date.parse(workshop.ends_at) + shift).toISOString(),
      is_open: true,
    })
    .eq("id", workshop.id);
  if (moved.error) throw new Error(moved.error.message);
  console.log("✓ Atölye iki hafta ileri alındı.");
}
