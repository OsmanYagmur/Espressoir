import {
  INVITE_EMAIL_MAX_LENGTH,
  INVITE_NOTE_MAX_LENGTH,
  INVITE_REQUEST_STATUSES,
} from "@espressoir/core";
import { z } from "zod";

import type { Database } from "./database.types";

/** What can be wrong with the form; each app words them itself. */
export const INVITE_REQUEST_ERRORS = ["emailInvalid", "noteTooLong", "consentRequired"] as const;
export type InviteRequestError = (typeof INVITE_REQUEST_ERRORS)[number];

const error = (code: InviteRequestError) => ({ error: code });

/** The "Davet iste" form: an address, an optional sentence, and the consent box. */
export const inviteRequestInputSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email(error("emailInvalid")).max(INVITE_EMAIL_MAX_LENGTH, error("emailInvalid")),
  ),
  note: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null),
    z.string().max(INVITE_NOTE_MAX_LENGTH, error("noteTooLong")).nullable(),
  ),
  consent: z.literal(true, error("consentRequired")),
});
export type InviteRequestInput = z.infer<typeof inviteRequestInputSchema>;

/** The columns a visitor may write; the status and the time are the database's. */
export function toInviteRequestInsert(
  input: InviteRequestInput,
): Database["public"]["Tables"]["invite_requests"]["Insert"] {
  return { email: input.email, note: input.note, consent: input.consent };
}

/** A request as the admin panel reads it. */
export const inviteRequestRowSchema = z
  .object({
    id: z.uuid(),
    email: z.string(),
    note: z.string().nullable(),
    status: z.enum(INVITE_REQUEST_STATUSES),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    email: row.email,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  }));
export type InviteRequest = z.infer<typeof inviteRequestRowSchema>;
