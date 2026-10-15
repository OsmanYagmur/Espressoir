/**
 * What the comment, like and report islands read and write, straight from the browser to
 * Supabase. The queries themselves are shared with the mobile app (`@espressoir/db`,
 * social.ts); this binds them to the browser's client.
 *
 * Loaded on demand: it brings the Supabase client and the row schemas with it, and most
 * pages are read without ever needing them.
 */
import type { ReportReason, ReportTarget } from "@espressoir/core";
import * as social from "@espressoir/db";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export { SocialFailure, type SocialError } from "@espressoir/db";

/** Who is signed in on this browser, if anyone. Read from the stored session: no request. */
export async function getViewerId(): Promise<string | null> {
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}

export const loadComments = (tastingId: string) =>
  social.loadComments(getBrowserSupabase(), tastingId);

export const addComment = (
  tastingId: string,
  viewerId: string,
  body: string,
  parentId: string | null,
) => social.addComment(getBrowserSupabase(), tastingId, viewerId, body, parentId);

export const editComment = (commentId: string, body: string) =>
  social.editComment(getBrowserSupabase(), commentId, body);

/** "deleted": gone. "blanked": it had replies, so an empty placeholder stays. */
export const removeComment = (commentId: string) =>
  social.removeComment(getBrowserSupabase(), commentId);

export const loadLikes = (tastingId: string, viewerId: string | null) =>
  social.loadLikes(getBrowserSupabase(), tastingId, viewerId);

export const setLiked = (tastingId: string, viewerId: string, liked: boolean) =>
  social.setLiked(getBrowserSupabase(), tastingId, viewerId, liked);

export const fileReport = (
  viewerId: string,
  target: ReportTarget,
  targetId: string,
  reason: ReportReason,
  details: string,
) => social.fileReport(getBrowserSupabase(), viewerId, target, targetId, reason, details);
