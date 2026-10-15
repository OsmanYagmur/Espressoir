import { loadFeedPage as loadPage, type FeedCursor, type FeedSource } from "@espressoir/db";

import { getBrowserSupabase } from "@/lib/supabase/browser";

import { FEED_PAGE_SIZE } from "./feed-config";

export type { FeedCursor, FeedSource } from "@espressoir/db";

/**
 * One page of a feed, older than `after`, read in the browser straight from Supabase (the
 * keyset paging is shared with the mobile app: `loadFeedPage` in `@espressoir/db`).
 *
 * Loaded on demand (it brings the Supabase client and the row schemas with it), so a
 * visitor who only reads the first page downloads neither.
 */
export const loadFeedPage = (source: FeedSource, after: FeedCursor | null) =>
  loadPage(getBrowserSupabase(), source, after, FEED_PAGE_SIZE);
