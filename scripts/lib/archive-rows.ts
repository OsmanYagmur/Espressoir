import type { ArchiveRows } from "@espressoir/db";

import type { Queryable } from "./postgres";

/**
 * Reads the archive's read models the way the public API serves them: as the `anon` role
 * (so RLS applies) and serialised to JSON by Postgres itself, which is what PostgREST does.
 * The result is interchangeable with a response from Supabase.
 */
export async function readArchiveRowsAsVisitor(db: Queryable): Promise<ArchiveRows> {
  const rows = async (query: string): Promise<unknown[]> => {
    const result = await db.query(
      `select coalesce(json_agg(r), '[]'::json) as rows from (${query}) as r`,
    );
    const value = result.rows[0]?.rows;
    return (typeof value === "string" ? JSON.parse(value) : value) as unknown[];
  };

  await db.query("begin");
  try {
    await db.query("set local role anon");
    return {
      coffees: await rows("select * from public.coffee_overview order by coffee_id"),
      tastings: await rows(
        "select * from public.tasting_feed where visibility = 'public' order by tasting_id",
      ),
      brewMethods: await rows("select * from public.brew_methods order by sort_order"),
      profiles: await rows("select * from public.profile_overview order by user_id"),
      flavorTags: await rows("select * from public.flavor_tags order by sort_order"),
      lists: await rows("select * from public.list_feed where is_public order by list_id"),
      cafes: await rows("select * from public.cafe_overview order by cafe_id"),
      cafeVisits: await rows(
        "select * from public.cafe_visit_feed where visibility = 'public' order by visit_id",
      ),
    };
  } finally {
    await db.query("rollback");
  }
}
