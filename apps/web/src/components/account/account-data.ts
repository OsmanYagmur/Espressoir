/**
 * What the header's account menu shows for a signed-in member: their name, picture, role
 * and how many notifications they have not seen. Read in the browser, straight from
 * Supabase, and loaded on demand: visitors never download it.
 */
import { countUnreadNotifications } from "@espressoir/db";

import { mediaUrl } from "@/lib/media";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export interface AccountSummary {
  username: string;
  /** False until the member has chosen a username (the placeholder is not shown). */
  onboarded: boolean;
  isAdmin: boolean;
  avatarUrl: string | null;
  unread: number;
}

export async function loadAccountSummary(): Promise<AccountSummary | null> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;

  const [{ data: profile }, unread] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_path, role, onboarded_at")
      .eq("id", userId)
      .maybeSingle(),
    countUnreadNotifications(supabase).catch(() => 0),
  ]);
  if (!profile) return null;

  return {
    username: profile.username,
    onboarded: profile.onboarded_at !== null,
    isAdmin: profile.role === "admin",
    avatarUrl: profile.avatar_path ? mediaUrl(profile.avatar_path) : null,
    unread,
  };
}
