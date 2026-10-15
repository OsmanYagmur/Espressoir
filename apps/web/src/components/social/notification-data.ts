/**
 * How many notifications the signed-in member has not seen. Read in the browser, straight
 * from Supabase (row level security shows a member their own). Loaded on demand: visitors
 * never download it.
 */
import { countUnreadNotifications as countUnread } from "@espressoir/db";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export async function countUnreadNotifications(): Promise<number> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0;
  return countUnread(supabase);
}
