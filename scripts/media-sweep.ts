/**
 * Removes pictures that nothing points at any more: uploaded but never saved with a
 * tasting, replaced, or left behind when removing them half failed. Pictures are files in
 * Storage, so deleting rows never takes them along; this is the safety net.
 *
 *   pnpm media:sweep                    dev: lists what it would remove
 *   pnpm media:sweep --apply            dev: removes it
 *   pnpm media:sweep --env prod [--apply]
 *
 * Files younger than a day are left alone: someone may be filling in a form right now.
 * Needs SUPABASE_DB_URL and SUPABASE_SECRET_KEY from the env file (scripts only).
 */
import { MEDIA_BUCKET } from "@espressoir/core";
import type { Database } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";

import { connectPostgres } from "./lib/postgres";
import { assertTarget, loadTargetEnv, parseTargetEnv, requireEnv } from "./lib/target-env";

const apply = process.argv.includes("--apply");
const BATCH = 100;

async function main(): Promise<void> {
  const target = parseTargetEnv();
  loadTargetEnv(target);
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  await assertTarget(target, dbUrl);

  const client = await connectPostgres(dbUrl);
  let orphans: string[];
  try {
    // A small twin ("…-s.webp") belongs to the full picture beside it.
    const { rows } = await client.query(
      `select o.name
         from storage.objects o
        where o.bucket_id = $1
          and o.created_at < now() - interval '1 day'
          and not exists (
            select 1 from public.tastings t
             where t.photo_path in (o.name, regexp_replace(o.name, '-s\\.(webp|jpg)$', '.\\1'))
          )
          and not exists (select 1 from public.profiles p where p.avatar_path = o.name)
        order by o.name`,
      [MEDIA_BUCKET],
    );
    orphans = rows.map((row) => (row as { name: string }).name);
  } finally {
    await client.end();
  }

  if (orphans.length === 0) {
    console.log(`✓ Sahipsiz fotoğraf yok (hedef: ${target}).`);
    return;
  }
  console.log(`${orphans.length} sahipsiz dosya (hedef: ${target}):`);
  for (const name of orphans) console.log(`  ${name}`);
  if (!apply) {
    console.log("\nSilmek için aynı komutu --apply ile çalıştır.");
    return;
  }

  // Through Storage, not SQL: deleting the row would leave the file itself behind.
  const supabase = createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let removed = 0;
  for (let i = 0; i < orphans.length; i += BATCH) {
    const batch = orphans.slice(i, i + BATCH);
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).remove(batch);
    if (error) throw new Error(`Silinemedi: ${error.message}`);
    removed += data?.length ?? 0;
  }
  console.log(`\n✓ ${removed} dosya silindi.`);
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
