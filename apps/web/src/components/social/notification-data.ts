/**
 * How many notifications the signed-in member has not seen. Read in the browser, straight
 * from Supabase (row level security shows a member their own). Loaded on demand: visitors
 * never download it.
 */
import { getBrowserSupabase } from "@/lib/supabase/browser";

export async function countUnreadNotifications(): Promise<number> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
