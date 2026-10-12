/**
 * Comments under a tasting, as the apps consume them. Rows come from the `comments` table
 * with the author's public name embedded; a removed comment arrives without words or
 * author and is shown as a placeholder for its replies.
 */
import { COMMENT_MAX_LENGTH } from "@espressoir/core";
import { z } from "zod";

/** The columns (and the author embed) every client asks for. */
export const COMMENT_SELECT =
  "id, tasting_id, user_id, parent_id, body, created_at, edited_at, deleted_at, hidden_at, author:profiles!comments_user_id_fkey(username, display_name)";

export const commentRowSchema = z
  .object({
    id: z.uuid(),
    tasting_id: z.uuid(),
    user_id: z.uuid().nullable(),
    parent_id: z.uuid().nullable(),
    body: z.string().nullable(),
    created_at: z.string(),
    edited_at: z.string().nullable(),
    deleted_at: z.string().nullable(),
    hidden_at: z.string().nullable(),
    author: z
      .object({ username: z.string().min(1), display_name: z.string().nullable() })
      .nullable(),
  })
  .transform((row) => ({
    id: row.id,
    tastingId: row.tasting_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    edited: row.edited_at !== null,
    /** Removed by its author or an admin; kept only because replies hang from it. */
    deleted: row.deleted_at !== null,
    /** Hidden by an admin: only its author and admins receive it at all. */
    hidden: row.hidden_at !== null,
    author:
      row.user_id && row.author
        ? { id: row.user_id, username: row.author.username, displayName: row.author.display_name }
        : null,
  }));

export type Comment = z.infer<typeof commentRowSchema>;

export interface CommentThread extends Comment {
  replies: Comment[];
}

/**
 * Top-level comments in the order given, each with its replies. A placeholder whose
 * replies are all gone has nothing left to hold up and is dropped.
 */
export function threadComments(comments: readonly Comment[]): CommentThread[] {
  const replies = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (comment.parentId) {
      replies.set(comment.parentId, [...(replies.get(comment.parentId) ?? []), comment]);
    }
  }
  return comments
    .filter((comment) => comment.parentId === null)
    .map((comment) => ({ ...comment, replies: replies.get(comment.id) ?? [] }))
    .filter((thread) => !thread.deleted || thread.replies.length > 0);
}

export type CommentInputError = "empty" | "tooLong";

/** What someone typed, as it will be stored, or why it cannot be. */
export function parseCommentBody(
  input: string,
): { ok: true; body: string } | { ok: false; error: CommentInputError } {
  const body = input.replace(/\r\n?/g, "\n").trim();
  if (body.length === 0) return { ok: false, error: "empty" };
  if (body.length > COMMENT_MAX_LENGTH) return { ok: false, error: "tooLong" };
  return { ok: true, body };
}
