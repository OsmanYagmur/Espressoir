/**
 * Lists: a member's named, ordered collections of coffees. Rows come from the `list_feed`
 * view, one per list with its entries inside; the coffees themselves are looked up in the
 * catalog by id.
 */
import {
  LIST_DESCRIPTION_MAX_LENGTH,
  LIST_NOTE_MAX_LENGTH,
  LIST_TITLE_MAX_LENGTH,
} from "@espressoir/core";
import { z } from "zod";

export const listRowSchema = z
  .object({
    list_id: z.uuid(),
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    is_public: z.boolean(),
    is_hidden: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    user_id: z.uuid(),
    username: z.string().min(1),
    display_name: z.string().nullable(),
    items: z.array(z.object({ coffee_id: z.uuid(), note: z.string().nullable() })),
  })
  .transform((row) => ({
    id: row.list_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    isPublic: row.is_public,
    /** Hidden by an admin: only its owner (and admins) ever receive such a row. */
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: { id: row.user_id, username: row.username, displayName: row.display_name },
    /** In the owner's order. */
    items: row.items.map((item) => ({ coffeeId: item.coffee_id, note: item.note })),
  }));

export type MemberList = z.infer<typeof listRowSchema>;

export const LIST_INPUT_ERRORS = [
  "invalid",
  "titleRequired",
  "titleTooLong",
  "descriptionTooLong",
  "noteTooLong",
] as const;
export type ListInputError = (typeof LIST_INPUT_ERRORS)[number];

const code = (error: ListInputError) => ({ error });
const tidy = (value: string) => value.trim().replace(/\s+/g, " ");

/** What the "new list" and "edit list" forms submit. */
export const listInputSchema = z.object({
  title: z
    .string()
    .transform(tidy)
    .pipe(
      z.string().min(1, code("titleRequired")).max(LIST_TITLE_MAX_LENGTH, code("titleTooLong")),
    ),
  description: z
    .string()
    .trim()
    .max(LIST_DESCRIPTION_MAX_LENGTH, code("descriptionTooLong"))
    .transform((value) => value || null),
  isPublic: z.boolean(),
});
export type ListInput = z.infer<typeof listInputSchema>;

/** The note beside a coffee on a list; empty means none. */
export const listNoteSchema = z
  .string()
  .trim()
  .max(LIST_NOTE_MAX_LENGTH, code("noteTooLong"))
  .transform((value) => value || null);
