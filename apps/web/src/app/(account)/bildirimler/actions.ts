"use server";

import { requireUser } from "@/lib/auth";

/**
 * Marks what the member has just been shown as read: everything up to the moment the list
 * was rendered, so that a notification arriving meanwhile is not swallowed unseen.
 * Nothing public changes, so no cached page is refreshed.
 */
export async function markNotificationsRead(shownAt: string): Promise<void> {
  const { supabase } = await requireUser();
  if (Number.isNaN(Date.parse(shownAt))) return;
  const { error } = await supabase.rpc("mark_notifications_read_v1", { p_before: shownAt });
  if (error) console.error("[notifications] not marked as read:", error.code);
}
