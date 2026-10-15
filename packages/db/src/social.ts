/**
 * What the social features read and write, straight from a signed-in client to Supabase:
 * comments, likes, follows, reports, feed pages, notifications, and a member's shelf ("want
 * to try" and lists). Shared by the website's islands and the mobile app: each passes its
 * own client (the browser's, the phone's) and words the failures itself. Row level
 * security, the rate limits and the comment rules do the guarding.
 */
import {
  MEDIA_BUCKET,
  smallPhotoPath,
  type ReportReason,
  type ReportTarget,
} from "@espressoir/core";
import { z } from "zod";

import { tastingRowSchema, type Tasting } from "./archive";
import { COMMENT_SELECT, commentRowSchema, type Comment } from "./comment";
import type { TypedSupabaseClient } from "./index";
import { listRowSchema, type ListInput, type MemberList } from "./list";
import { notificationRowSchema, type Notification } from "./notification";

export type SocialError =
  | "rateLimited"
  | "restricted"
  | "duplicate"
  | "parentGone"
  | "tooManyLists"
  | "listFull"
  | "failed";

/** A refusal from the database, reduced to what the person can do about it. */
export class SocialFailure extends Error {
  constructor(readonly kind: SocialError) {
    super(kind);
  }
}

/** The kind of a database refusal (Postgres codes and the messages our triggers raise). */
export function socialErrorKind(error: { code?: string; message: string }): SocialError {
  const { code, message } = error;
  if (message.includes("rate_limited")) return "rateLimited";
  if (message.includes("comment_parent")) return "parentGone";
  if (message.includes("too_many_lists")) return "tooManyLists";
  if (message.includes("list_full")) return "listFull";
  if (code === "23505") return "duplicate";
  if (code === "42501" || message.includes("row-level security")) return "restricted";
  return "failed";
}

function refuse(error: { code?: string; message: string }): never {
  throw new SocialFailure(socialErrorKind(error));
}

// ── comments ──────────────────────────────────────────────────────────────────────────────

export async function loadComments(
  client: TypedSupabaseClient,
  tastingId: string,
): Promise<Comment[]> {
  const { data, error } = await client
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("tasting_id", tastingId)
    .order("created_at")
    .order("id");
  if (error) refuse(error);
  return z.array(commentRowSchema).parse(data);
}

export async function addComment(
  client: TypedSupabaseClient,
  tastingId: string,
  viewerId: string,
  body: string,
  parentId: string | null,
): Promise<Comment> {
  const { data, error } = await client
    .from("comments")
    .insert({ tasting_id: tastingId, user_id: viewerId, parent_id: parentId, body })
    .select(COMMENT_SELECT)
    .single();
  if (error) refuse(error);
  return commentRowSchema.parse(data);
}

export async function editComment(
  client: TypedSupabaseClient,
  commentId: string,
  body: string,
): Promise<Comment> {
  const { data, error } = await client
    .from("comments")
    .update({ body })
    .eq("id", commentId)
    .select(COMMENT_SELECT)
    .single();
  if (error) refuse(error);
  return commentRowSchema.parse(data);
}

/** "deleted": gone. "blanked": it had replies, so an empty placeholder stays. */
export async function removeComment(
  client: TypedSupabaseClient,
  commentId: string,
): Promise<"deleted" | "blanked"> {
  const { data, error } = await client.rpc("delete_comment_v1", { p_comment_id: commentId });
  if (error) refuse(error);
  return data === "blanked" ? "blanked" : "deleted";
}

// ── likes, follows, reports ───────────────────────────────────────────────────────────────

export async function loadLikes(
  client: TypedSupabaseClient,
  tastingId: string,
  viewerId: string | null,
): Promise<{ count: number; liked: boolean }> {
  const total = await client
    .from("likes")
    .select("user_id", { count: "exact", head: true })
    .eq("tasting_id", tastingId);
  if (total.error) refuse(total.error);
  if (!viewerId) return { count: total.count ?? 0, liked: false };

  const mine = await client
    .from("likes")
    .select("user_id")
    .eq("tasting_id", tastingId)
    .eq("user_id", viewerId);
  if (mine.error) refuse(mine.error);
  return { count: total.count ?? 0, liked: mine.data.length > 0 };
}

export async function setLiked(
  client: TypedSupabaseClient,
  tastingId: string,
  viewerId: string,
  liked: boolean,
): Promise<void> {
  const likes = client.from("likes");
  const { error } = liked
    ? await likes.insert({ tasting_id: tastingId, user_id: viewerId })
    : await likes.delete().eq("tasting_id", tastingId).eq("user_id", viewerId);
  // Liking twice from two screens is not a failure worth reporting.
  if (error && error.code !== "23505") refuse(error);
}

export async function isFollowing(
  client: TypedSupabaseClient,
  viewerId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", userId);
  if (error) refuse(error);
  return data.length > 0;
}

export async function setFollowing(
  client: TypedSupabaseClient,
  viewerId: string,
  userId: string,
  on: boolean,
): Promise<void> {
  const follows = client.from("follows");
  const { error } = on
    ? await follows.insert({ follower_id: viewerId, following_id: userId })
    : await follows.delete().eq("follower_id", viewerId).eq("following_id", userId);
  // Following twice is what was asked for.
  if (error && !(on && error.code === "23505")) refuse(error);
}

export async function fileReport(
  client: TypedSupabaseClient,
  viewerId: string,
  target: ReportTarget,
  targetId: string,
  reason: ReportReason,
  details: string,
): Promise<void> {
  const { error } = await client.from("reports").insert({
    reporter_id: viewerId,
    target_type: target,
    target_id: targetId,
    reason,
    details: details.trim() || null,
  });
  if (error) refuse(error);
}

// ── tastings and feeds ────────────────────────────────────────────────────────────────────

export type FeedSource = "tasting_feed" | "following_feed";

/** Where a page ended: the entry time and id of its last row. */
export interface FeedCursor {
  createdAt: string;
  id: string;
}

export const feedCursorOf = (tasting: Tasting | undefined): FeedCursor | null =>
  tasting ? { createdAt: tasting.createdAt, id: tasting.id } : null;

/**
 * One page of a feed, older than `after`. Keyset paging on (entry time, id): entries added
 * meanwhile never shift or repeat a page, and rows that share a timestamp (an import
 * writes many at once) are not skipped. Row level security decides what comes back.
 */
export async function loadFeedPage(
  client: TypedSupabaseClient,
  source: FeedSource,
  after: FeedCursor | null,
  limit: number,
): Promise<Tasting[]> {
  let query = client
    .from(source)
    .select("*")
    .eq("status", "logged")
    .order("created_at", { ascending: false })
    .order("tasting_id", { ascending: false })
    .limit(limit);
  if (source === "tasting_feed") query = query.eq("visibility", "public");
  if (after) {
    const at = `"${after.createdAt}"`;
    query = query.or(`created_at.lt.${at},and(created_at.eq.${at},tasting_id.lt.${after.id})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return z.array(tastingRowSchema).parse(data);
}

/**
 * One tasting as the viewer may see it: public ones for everyone, followers-only ones for
 * followers, private and hidden ones for their author. Null when it is not there for them.
 */
export async function loadTasting(
  client: TypedSupabaseClient,
  tastingId: string,
): Promise<Tasting | null> {
  const { data, error } = await client
    .from("tasting_feed")
    .select("*")
    .eq("tasting_id", tastingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? tastingRowSchema.parse(data) : null;
}

/** Everything a member wrote, whatever its visibility: for their own eyes (RLS). */
export async function loadOwnTastings(
  client: TypedSupabaseClient,
  viewerId: string,
): Promise<Tasting[]> {
  const { data, error } = await client
    .from("tasting_feed")
    .select("*")
    .eq("user_id", viewerId)
    .order("created_at", { ascending: false })
    .order("tasting_id", { ascending: false });
  if (error) throw new Error(error.message);
  return z.array(tastingRowSchema).parse(data);
}

/**
 * Deletes one of the viewer's tastings (row level security limits it to their own), then
 * its picture's files: once the row is gone nothing points at them. A file that cannot be
 * removed is left for `pnpm media:sweep`.
 */
export async function deleteTasting(client: TypedSupabaseClient, tastingId: string): Promise<void> {
  const { data, error } = await client
    .from("tastings")
    .delete()
    .eq("id", tastingId)
    .select("photo_path");
  if (error) refuse(error);
  const files = data.flatMap((row) =>
    row.photo_path ? [row.photo_path, smallPhotoPath(row.photo_path)] : [],
  );
  if (files.length > 0) await client.storage.from(MEDIA_BUCKET).remove(files);
}

// ── notifications ─────────────────────────────────────────────────────────────────────────

export async function countUnreadNotifications(client: TypedSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadNotifications(
  client: TypedSupabaseClient,
  limit: number,
): Promise<Notification[]> {
  const { data, error } = await client
    .from("notification_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return z.array(notificationRowSchema).parse(data);
}

/**
 * Marks as read what arrived up to `before` (when the list was put on screen), so one that
 * arrives while it is being read stays new.
 */
export async function markNotificationsRead(
  client: TypedSupabaseClient,
  before: string,
): Promise<void> {
  const { error } = await client.rpc("mark_notifications_read_v1", { p_before: before });
  if (error) throw new Error(error.message);
}

// ── a member's shelf: "want to try" and lists ─────────────────────────────────────────────

export interface ShelfList {
  id: string;
  title: string;
  isPublic: boolean;
  /** This coffee is on the list. */
  has: boolean;
}

export interface CoffeeShelf {
  wantsToTry: boolean;
  lists: ShelfList[];
}

/** Whether a coffee is on the viewer's "want to try" list, and which of their lists hold it. */
export async function loadCoffeeShelf(
  client: TypedSupabaseClient,
  viewerId: string,
  coffeeId: string,
): Promise<CoffeeShelf> {
  const [wish, lists] = await Promise.all([
    client
      .from("tastings")
      .select("id")
      .eq("user_id", viewerId)
      .eq("coffee_id", coffeeId)
      .eq("status", "wishlist")
      .limit(1),
    // Every list of the viewer's; the embedded entries are narrowed to this coffee, so an
    // empty array means "not on this list".
    client
      .from("lists")
      .select("id, title, is_public, list_items(coffee_id)")
      .eq("user_id", viewerId)
      .eq("list_items.coffee_id", coffeeId)
      .order("updated_at", { ascending: false }),
  ]);
  if (wish.error) refuse(wish.error);
  if (lists.error) refuse(lists.error);

  return {
    wantsToTry: wish.data.length > 0,
    lists: lists.data.map((list) => ({
      id: list.id,
      title: list.title,
      isPublic: list.is_public,
      has: list.list_items.length > 0,
    })),
  };
}

/**
 * "Want to try" is a wishlist entry: a tasting without score or date, as it always was.
 * One per member per coffee; asking twice is not an error.
 */
export async function setWantToTry(
  client: TypedSupabaseClient,
  viewerId: string,
  coffeeId: string,
  on: boolean,
): Promise<void> {
  if (on) {
    const { error } = await client.rpc("log_tasting_v1", {
      p_coffee_id: coffeeId,
      p_status: "wishlist",
    });
    if (error && !error.message.includes("tastings_one_wishlist_per_coffee_key")) refuse(error);
    return;
  }
  const { error } = await client
    .from("tastings")
    .delete()
    .eq("user_id", viewerId)
    .eq("coffee_id", coffeeId)
    .eq("status", "wishlist");
  if (error) refuse(error);
}

/** Puts a coffee on one of the viewer's lists, or takes it off. */
export async function setListItem(
  client: TypedSupabaseClient,
  listId: string,
  coffeeId: string,
  on: boolean,
): Promise<void> {
  const items = client.from("list_items");
  const { error } = on
    ? await items.insert({ list_id: listId, coffee_id: coffeeId })
    : await items.delete().eq("list_id", listId).eq("coffee_id", coffeeId);
  // Already there: what was asked for is true.
  if (error && !(on && error.code === "23505")) refuse(error);
}

/** A new list of the viewer's (validated with `listInputSchema` first). */
export async function createList(
  client: TypedSupabaseClient,
  viewerId: string,
  input: ListInput,
): Promise<{ id: string; title: string }> {
  const { data, error } = await client
    .from("lists")
    .insert({
      user_id: viewerId,
      title: input.title,
      description: input.description,
      is_public: input.isPublic,
    })
    .select("id, title")
    .single();
  if (error) refuse(error);
  return data;
}

export async function deleteList(client: TypedSupabaseClient, listId: string): Promise<void> {
  const { error } = await client.from("lists").delete().eq("id", listId);
  if (error) refuse(error);
}

/** A member's lists as the viewer may see them: all of their own, public ones of others. */
export async function loadMemberLists(
  client: TypedSupabaseClient,
  userId: string,
): Promise<MemberList[]> {
  const { data, error } = await client
    .from("list_feed")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return z.array(listRowSchema).parse(data);
}
