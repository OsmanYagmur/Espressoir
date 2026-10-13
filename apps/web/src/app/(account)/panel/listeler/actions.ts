"use server";

import {
  LISTS_PER_MEMBER_MAX,
  LIST_DESCRIPTION_MAX_LENGTH,
  LIST_ITEMS_MAX,
  LIST_NOTE_MAX_LENGTH,
  LIST_TITLE_MAX_LENGTH,
} from "@espressoir/core";
import { LIST_INPUT_ERRORS, listInputSchema, listNoteSchema } from "@espressoir/db";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { refreshArchive } from "@/lib/data/refresh-archive";
import { format, t } from "@/lib/i18n";

const l = t.lists;
const id = z.uuid();
const LISTS = "/panel/listeler" as Route;
const editor = (listId: string, error?: string) =>
  `${LISTS}/${listId}${error ? `?hata=${error}` : ""}` as Route;

export interface ListFormState {
  /** Field name → message, for the fields that need fixing. */
  errors?: Record<string, string>;
  message?: string;
  saved?: boolean;
  /** What was submitted, so the form can show it again. */
  values?: Record<string, string>;
}

/** What the buttons on a coffee's page get back: they stay on the page either way. */
export type ListActionResult = { ok: true } | { ok: false; message: string };

function inputMessage(code: string): string {
  const known = LIST_INPUT_ERRORS.find((error) => error === code) ?? "invalid";
  if (known === "titleTooLong")
    return format(l.errors.titleTooLong, { max: LIST_TITLE_MAX_LENGTH });
  if (known === "descriptionTooLong") {
    return format(l.errors.descriptionTooLong, { max: LIST_DESCRIPTION_MAX_LENGTH });
  }
  if (known === "noteTooLong") return format(l.errors.noteTooLong, { max: LIST_NOTE_MAX_LENGTH });
  return l.errors[known];
}

/** Turns a database refusal into something a person can act on. */
function databaseMessage(error: { code?: string; message: string }): string {
  const { code, message } = error;
  if (message.includes("rate_limited")) return l.add.rateLimited;
  if (message.includes("too_many_lists")) {
    return format(l.add.tooMany, { max: LISTS_PER_MEMBER_MAX });
  }
  if (message.includes("list_full")) return format(l.add.full, { max: LIST_ITEMS_MAX });
  if (code === "23505") return l.errors.duplicate;
  if (code === "42501" || message.includes("row-level security")) return l.add.restricted;
  return l.errors.failed;
}

function readList(formData: FormData) {
  const values = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    visibility: String(formData.get("visibility") ?? "public"),
  };
  const parsed = listInputSchema.safeParse({
    title: values.title,
    description: values.description,
    isPublic: values.visibility !== "private",
  });
  return { values, parsed };
}

function invalid(error: z.ZodError, values: Record<string, string>): ListFormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[String(issue.path.at(-1) ?? "form")] ??= inputMessage(issue.message);
  }
  return { errors, message: l.errors.invalid, values };
}

// ── the signed-in area: plain forms ───────────────────────────────────────────────────────

export async function createList(
  _previous: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const { user, supabase } = await requireUser();
  const { values, parsed } = readList(formData);
  if (!parsed.success) return invalid(parsed.error, values);

  const { data, error } = await supabase
    .from("lists")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      is_public: parsed.data.isPublic,
    })
    .select("id")
    .single();
  if (error) return { message: databaseMessage(error), values };

  refreshArchive();
  redirect(editor(data.id));
}

export async function updateList(
  listId: string,
  _previous: ListFormState,
  formData: FormData,
): Promise<ListFormState> {
  const { supabase } = await requireUser();
  const { values, parsed } = readList(formData);
  if (!parsed.success) return invalid(parsed.error, values);
  if (!id.safeParse(listId).success) return { message: l.panel.notFound, values };

  // Row level security limits this to the member's own list; no row back means it is not.
  const { data, error } = await supabase
    .from("lists")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      is_public: parsed.data.isPublic,
    })
    .eq("id", listId)
    .select("id");
  if (error) return { message: databaseMessage(error), values };
  if (!data || data.length === 0) return { message: l.panel.notFound, values };

  refreshArchive();
  return { saved: true, values };
}

export async function deleteList(listId: string): Promise<void> {
  const { supabase } = await requireUser();
  if (id.safeParse(listId).success) {
    await supabase.from("lists").delete().eq("id", listId);
    refreshArchive();
  }
  redirect(LISTS);
}

export async function addListItem(listId: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const coffeeId = id.safeParse(formData.get("coffeeId"));
  if (!id.safeParse(listId).success) redirect(LISTS);
  if (!coffeeId.success) redirect(editor(listId, "kahve"));

  const { error } = await supabase
    .from("list_items")
    .insert({ list_id: listId, coffee_id: coffeeId.data });
  if (error) redirect(editor(listId, errorCode(error)));
  refreshArchive();
  redirect(editor(listId));
}

export async function removeListItem(listId: string, coffeeId: string): Promise<void> {
  const { supabase } = await requireUser();
  if (!id.safeParse(listId).success) redirect(LISTS);
  if (id.safeParse(coffeeId).success) {
    await supabase.from("list_items").delete().eq("list_id", listId).eq("coffee_id", coffeeId);
    refreshArchive();
  }
  redirect(editor(listId));
}

export async function setListItemNote(
  listId: string,
  coffeeId: string,
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireUser();
  if (!id.safeParse(listId).success) redirect(LISTS);
  const note = listNoteSchema.safeParse(String(formData.get("note") ?? ""));
  if (!note.success || !id.safeParse(coffeeId).success) redirect(editor(listId, "not"));

  const { error } = await supabase
    .from("list_items")
    .update({ note: note.data })
    .eq("list_id", listId)
    .eq("coffee_id", coffeeId);
  if (error) redirect(editor(listId, errorCode(error)));
  refreshArchive();
  redirect(editor(listId));
}

/** Swaps an entry with its neighbour. The whole order goes to the database in one call. */
export async function moveListItem(
  listId: string,
  coffeeId: string,
  direction: "up" | "down",
): Promise<void> {
  const { supabase } = await requireUser();
  if (!id.safeParse(listId).success) redirect(LISTS);

  const { data } = await supabase
    .from("list_items")
    .select("coffee_id")
    .eq("list_id", listId)
    .order("position")
    .order("created_at");
  const order = (data ?? []).map((row) => row.coffee_id);
  const from = order.indexOf(coffeeId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= order.length) redirect(editor(listId));

  [order[from], order[to]] = [order[to]!, order[from]!];
  const { error } = await supabase.rpc("reorder_list_v1", {
    p_list_id: listId,
    p_coffee_ids: order,
  });
  if (error) redirect(editor(listId, errorCode(error)));
  refreshArchive();
  redirect(editor(listId));
}

/** The short code a refusal travels under in the editor's address (see `editorError`). */
function errorCode(error: { code?: string; message: string }): string {
  if (error.message.includes("list_full")) return "dolu";
  if (error.code === "23505") return "var";
  if (error.code === "42501" || error.message.includes("row-level security")) return "kisitli";
  return "hata";
}

// ── from a coffee's page: the result comes back, nobody is sent anywhere ──────────────────

export async function toggleListItem(
  listId: string,
  coffeeId: string,
  on: boolean,
): Promise<ListActionResult> {
  const { supabase } = await requireUser();
  if (!id.safeParse(listId).success || !id.safeParse(coffeeId).success) {
    return { ok: false, message: l.errors.failed };
  }
  const items = supabase.from("list_items");
  const { error } = on
    ? await items.insert({ list_id: listId, coffee_id: coffeeId })
    : await items.delete().eq("list_id", listId).eq("coffee_id", coffeeId);
  // Already there: what was asked for is true.
  if (error && !(on && error.code === "23505")) {
    return { ok: false, message: databaseMessage(error) };
  }
  refreshArchive();
  return { ok: true };
}

export async function createListWith(
  title: string,
  coffeeId: string,
): Promise<{ ok: true; list: { id: string; title: string } } | { ok: false; message: string }> {
  const { user, supabase } = await requireUser();
  const parsed = listInputSchema.safeParse({ title, description: "", isPublic: true });
  if (!parsed.success) {
    return { ok: false, message: inputMessage(parsed.error.issues[0]?.message ?? "invalid") };
  }
  if (!id.safeParse(coffeeId).success) return { ok: false, message: l.errors.failed };

  const { data: list, error } = await supabase
    .from("lists")
    .insert({ user_id: user.id, title: parsed.data.title, is_public: true })
    .select("id, title")
    .single();
  if (error) return { ok: false, message: databaseMessage(error) };

  const added = await supabase.from("list_items").insert({ list_id: list.id, coffee_id: coffeeId });
  refreshArchive();
  if (added.error) return { ok: false, message: databaseMessage(added.error) };
  return { ok: true, list };
}

/**
 * "Want to try" is a wishlist entry: a tasting without score or date, as it always was.
 * One per member per coffee; asking twice is not an error.
 */
export async function setWantToTry(coffeeId: string, on: boolean): Promise<ListActionResult> {
  const { user, supabase } = await requireUser();
  if (!id.safeParse(coffeeId).success) return { ok: false, message: l.want.failed };

  if (on) {
    const { error } = await supabase.rpc("log_tasting_v1", {
      p_coffee_id: coffeeId,
      p_status: "wishlist",
    });
    if (error && !error.message.includes("tastings_one_wishlist_per_coffee_key")) {
      const refused =
        error.code === "42501" || error.message.includes("row-level security")
          ? l.add.restricted
          : error.message.includes("rate_limited")
            ? t.panel.errors.rateLimited
            : l.want.failed;
      return { ok: false, message: refused };
    }
  } else {
    const { error } = await supabase
      .from("tastings")
      .delete()
      .eq("user_id", user.id)
      .eq("coffee_id", coffeeId)
      .eq("status", "wishlist");
    if (error) return { ok: false, message: l.want.failed };
  }
  refreshArchive();
  return { ok: true };
}
