"use server";

import { WORKSHOP_NAME_MAX_LENGTH, WORKSHOP_QUESTION_MAX_LENGTH } from "@espressoir/core";
import {
  WORKSHOP_APPLICATION_ERRORS,
  toWorkshopApplicationInsert,
  workshopApplicationInputSchema,
  workshopRowSchema,
  type WorkshopApplicationError,
} from "@espressoir/db";
import { after } from "next/server";

import { refreshWorkshops } from "@/lib/data/refresh-archive";
import { format, t } from "@/lib/i18n";
import { createPublicClient } from "@/lib/supabase/public";
import { notifyNewApplication } from "@/lib/workshop-mail";

const e = t.workshop.errors;

/** The form's own field names. */
export type ApplyField = "name" | "contact" | "experience" | "question" | "consent";

export interface ApplyFormState {
  /** The application is in: the form gives way to the thank-you note. */
  done?: boolean;
  /** Field → the sentence saying what to fix. */
  errors?: Partial<Record<ApplyField, string>>;
  /** About the whole form: the database's refusal, or "fix the fields below". */
  message?: string;
  /** What was submitted, so the form shows it again instead of going blank. */
  values?: Partial<Record<ApplyField, string>>;
}

function errorText(code: string): string {
  const known = WORKSHOP_APPLICATION_ERRORS.find((error) => error === code) as
    WorkshopApplicationError | undefined;
  if (known === "nameTooLong") return format(e.nameTooLong, { max: WORKSHOP_NAME_MAX_LENGTH });
  if (known === "questionTooLong") {
    return format(e.questionTooLong, { max: WORKSHOP_QUESTION_MAX_LENGTH });
  }
  return known ? e[known] : e.invalid;
}

/** Turns a database refusal into something the applicant can act on. */
function databaseMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505" || error.message.includes("one_per_contact")) return e.duplicate;
  if (error.message.includes("workshop_closed")) return e.closed;
  if (error.message.includes("rate_limited")) return e.rateLimited;
  return e.failed;
}

/**
 * An application to a workshop, from anyone, signed in or not: checked here, then written
 * with the public key. The database decides the rest (open? full? the same person twice?)
 * and nobody can read the row back.
 */
export async function applyToWorkshop(
  _previous: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  // A field people never see (it is off screen and skipped by the keyboard): a form that
  // arrives with it filled in was filled in by a program. It gets the same thanks as
  // everyone, and nothing is stored.
  if (text("website").trim() !== "") return { done: true };

  const values = {
    name: text("name"),
    contact: text("contact"),
    experience: text("experience"),
    question: text("question"),
  };
  const parsed = workshopApplicationInputSchema.safeParse({
    workshopId: text("workshopId"),
    ...values,
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    const errors: ApplyFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field === "workshopId") return { message: e.failed, values };
      errors[field as ApplyField] ??= errorText(issue.message);
    }
    return { errors, message: e.invalid, values };
  }

  const supabase = createPublicClient();
  // Read fresh (not from the page's cache): for the notification's "waitlist" line.
  const { data: before } = await supabase
    .from("workshop_overview")
    .select("*")
    .eq("workshop_id", parsed.data.workshopId)
    .maybeSingle();
  const { error } = await supabase
    .from("workshop_applications")
    .insert(toWorkshopApplicationInsert(parsed.data));
  if (error) return { message: databaseMessage(error), values };

  // The page shows the seats left: one fewer now.
  refreshWorkshops();
  const workshop = before ? workshopRowSchema.parse(before) : null;
  if (workshop) {
    after(() => notifyNewApplication(parsed.data, workshop, workshop.seatsLeft === 0));
  }
  return { done: true };
}
