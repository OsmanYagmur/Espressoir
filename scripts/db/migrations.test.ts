import { describe, expect, it } from "vitest";

import { applyMigrations, createEmbeddedPostgres, listMigrations } from "../lib/postgres";

/** Everything our migrations own, as comparable strings. */
const SNAPSHOT_SQL = `
  select 'table ' || c.relname || ' rls=' || c.relrowsecurity as item
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'i')
  union all
  select 'column ' || table_name || '.' || column_name || ' ' || data_type || ' null=' || is_nullable
    from information_schema.columns where table_schema = 'public'
  union all
  select 'function ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  union all
  select 'type ' || t.typname || ' ' || coalesce(string_agg(e.enumlabel, ',' order by e.enumsortorder), '')
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
   where n.nspname = 'public' group by t.typname
  union all
  select 'policy ' || tablename || '.' || policyname || ' ' || cmd || ' ' || array_to_string(roles, ',')
    from pg_policies where schemaname = 'public'
  union all
  select 'constraint ' || conrelid::regclass || '.' || conname
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'
  union all
  select 'trigger ' || event_object_schema || '.' || event_object_table || '.' || trigger_name
    from information_schema.triggers
  union all
  select 'grant ' || table_name || ' ' || grantee || ' ' || privilege_type
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
  order by 1
`;

describe("migrations", () => {
  it("every migration has a rollback and both run cleanly, twice", async () => {
    const db = await createEmbeddedPostgres();
    const snapshot = async () =>
      (await db.query<{ item: string }>(SNAPSHOT_SQL)).rows.map((row) => row.item);

    const empty = await snapshot();
    await applyMigrations(db);
    const applied = await snapshot();
    expect(applied.length).toBeGreaterThan(empty.length);

    for (const migration of listMigrations().reverse()) {
      await db.exec(migration.down);
    }
    expect(await snapshot()).toEqual(empty);

    await applyMigrations(db);
    expect(await snapshot()).toEqual(applied);
    await db.close();
  });

  it("enables row level security on every table", async () => {
    const db = await createEmbeddedPostgres();
    await applyMigrations(db);
    const unprotected = await db.query<{ relname: string }>(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    `);
    expect(unprotected.rows).toEqual([]);
    await db.close();
  });
});
