/**
 * What the comment, like and report islands read and write, straight from the browser to
 * Supabase (row level security, the rate limits and the comment rules do the guarding).
 *
 * Loaded on demand: it brings the Supabase client and the row schemas with it, and most
 * pages are read without ever needing them.
 */
import type { ReportReason, ReportTarget } from "@espressoir/core";
import { COMMENT_SELECT, commentRowSchema, type Comment } from "@espressoir/db";
import { z } from "zod";

import { getBrowserSupabase } from "@/lib/supabase/browser";

export type SocialError = "rateLimited" | "restricted" | "duplicate" | "parentGone" | "failed";

/** A refusal from the database, reduced to what the person can do about it. */
export class SocialFailure extends Error {
  constructor(readonly kind: SocialError) {
    super(kind);
  }
}

function refuse(error: { code?: string; message: string }): never {
  const { code, message } = error;
  if (message.includes("rate_limited")) throw new SocialFailure("rateLimited");
  if (message.includes("comment_parent")) throw new SocialFailure("parentGone");
  if (code === "23505") throw new SocialFailure("duplicate");
  if (code === "42501" || message.includes("row-level security")) {
    throw new SocialFailure("restricted");
  }
  throw new SocialFailure("failed");
}

/** Who is signed in on this browser, if anyone. Read from the stored session: no request. */
export async function getViewerId(): Promise<string | null> {
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}

export async function loadComments(tastingId: string): Promise<Comment[]> {
  const { data, error } = await getBrowserSupabase()
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("tasting_id", tastingId)
    .order("created_at")
    .order("id");
  if (error) refuse(error);
  return z.array(commentRowSchema).parse(data);
}

export async function addComment(
  tastingId: string,
  viewerId: string,
  body: string,
  parentId: string | null,
): Promise<Comment> {
  const { data, error } = await getBrowserSupabase()
    .from("comments")
    .insert({ tasting_id: tastingId, user_id: viewerId, parent_id: parentId, body })
    .select(COMMENT_SELECT)
    .single();
  if (error) refuse(error);
  return commentRowSchema.parse(data);
}

export async function editComment(commentId: string, body: string): Promise<Comment> {
  const { data, error } = await getBrowserSupabase()
    .from("comments")
    .update({ body })
    .eq("id", commentId)
    .select(COMMENT_SELECT)
    .single();
  if (error) refuse(error);
  return commentRowSchema.parse(data);
}

/** "deleted": gone. "blanked": it had replies, so an empty placeholder stays. */
export async function removeComment(commentId: string): Promise<"deleted" | "blanked"> {
  const { data, error } = await getBrowserSupabase().rpc("delete_comment_v1", {
    p_comment_id: commentId,
  });
  if (error) refuse(error);
  return data === "blanked" ? "blanked" : "deleted";
}

export async function loadLikes(
  tastingId: string,
  viewerId: string | null,
): Promise<{ count: number; liked: boolean }> {
  const likes = getBrowserSupabase().from("likes");
  const total = await likes
    .select("user_id", { count: "exact", head: true })
    .eq("tasting_id", tastingId);
  if (total.error) refuse(total.error);
  if (!viewerId) return { count: total.count ?? 0, liked: false };

  const mine = await getBrowserSupabase()
    .from("likes")
    .select("user_id")
    .eq("tasting_id", tastingId)
    .eq("user_id", viewerId);
  if (mine.error) refuse(mine.error);
  return { count: total.count ?? 0, liked: mine.data.length > 0 };
}

export async function setLiked(tastingId: string, viewerId: string, liked: boolean) {
  const likes = getBrowserSupabase().from("likes");
  const { error } = liked
    ? await likes.insert({ tasting_id: tastingId, user_id: viewerId })
    : await likes.delete().eq("tasting_id", tastingId).eq("user_id", viewerId);
  // Liking twice from two tabs is not a failure worth reporting.
  if (error && error.code !== "23505") refuse(error);
}

export async function fileReport(
  viewerId: string,
  target: ReportTarget,
  targetId: string,
  reason: ReportReason,
  details: string,
) {
  const { error } = await getBrowserSupabase()
    .from("reports")
    .insert({
      reporter_id: viewerId,
      target_type: target,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
  if (error) refuse(error);
}
