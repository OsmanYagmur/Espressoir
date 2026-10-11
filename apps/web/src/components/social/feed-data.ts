import { tastingRowSchema, type Tasting } from "@espressoir/db";
import { z } from "zod";

import { getBrowserSupabase } from "@/lib/supabase/browser";

import { FEED_PAGE_SIZE } from "./feed-config";

export type FeedSource = "tasting_feed" | "following_feed";

/** Where a page ended: the entry time and id of its last row. */
export interface FeedCursor {
  createdAt: string;
  id: string;
}

/**
 * One page of a feed, older than `after`. Keyset paging on (entry time, id): entries added
 * meanwhile never shift or repeat a page, and rows that share a timestamp (an import
 * writes many at once) are not skipped. The browser reads straight from Supabase: no
 * server function runs, and row level security decides what comes back.
 *
 * Loaded on demand (it brings the Supabase client and the row schemas with it), so a
 * visitor who only reads the first page downloads neither.
 */
export async function loadFeedPage(
  source: FeedSource,
  after: FeedCursor | null,
): Promise<Tasting[]> {
  let query = getBrowserSupabase()
    .from(source)
    .select("*")
    .eq("status", "logged")
    .order("created_at", { ascending: false })
    .order("tasting_id", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (source === "tasting_feed") query = query.eq("visibility", "public");
  if (after) {
    const at = `"${after.createdAt}"`;
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},tasting_id.lt.${after.id})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return z.array(tastingRowSchema).parse(data);
}
