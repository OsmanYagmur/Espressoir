"use server";

import { BUSINESS_DESCRIPTION_MAX_LENGTH, VERIFICATION_MESSAGE_MAX_LENGTH } from "@espressoir/core";
import {
  BUSINESS_INPUT_ERRORS,
  businessPageInputSchema,
  verificationRequestInputSchema,
  type BusinessInputError,
} from "@espressoir/db";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { refreshArchive } from "@/lib/data/refresh-archive";
import { format, t } from "@/lib/i18n";

const e = t.business.errors;

export type BusinessKind = "brand" | "cafe";

export interface BusinessFormState {
  errors?: Record<string, string>;
  message?: string;
  /** What was submitted, so the form can show it again. */
  values?: Record<string, string>;
  done?: boolean;
}

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && !name.startsWith("$")) values[name] = value;
  }
  return values;
}

function errorText(code: string): string {
  const known = BUSINESS_INPUT_ERRORS.find((error) => error === code) as
    BusinessInputError | undefined;
  if (known === "messageTooLong")
    return format(e.messageTooLong, { max: VERIFICATION_MESSAGE_MAX_LENGTH });
  if (known === "descriptionTooLong") {
    return format(e.descriptionTooLong, { max: BUSINESS_DESCRIPTION_MAX_LENGTH });
  }
  return e[known ?? "invalid"];
}

function validationState(error: z.ZodError, values: Record<string, string>): BusinessFormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path.at(-1) ?? "form");
    errors[field] ??= errorText(issue.message);
  }
  return { errors, message: e.invalid, values };
}

function databaseMessage(error: { code?: string; message: string }): string {
  if (error.message.includes("already_official")) return e.alreadyOfficial;
  if (error.message.includes("verification_requests_open_")) return e.duplicate;
  if (error.message.includes("rate_limited")) return e.rateLimited;
  if (error.message.includes("map_url_format")) return e.mapUrlInvalid;
  if (error.message.includes("website_format")) return e.websiteInvalid;
  if (
    error.code === "42501" ||
    error.message.includes("row-level security") ||
    error.message.includes("not_allowed")
  ) {
    return e.notAllowed;
  }
  return e.failed;
}

/** "This business is mine": the application an admin answers. */
export async function applyForBusiness(
  kind: BusinessKind,
  businessId: string,
  _previous: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const { user, supabase } = await requireUser();
  const values = readValues(formData);
  if (!z.uuid().safeParse(businessId).success) return { message: e.invalid, values };
  const parsed = verificationRequestInputSchema.safeParse({
    message: values.message ?? "",
    website: values.website ?? "",
  });
  if (!parsed.success) return validationState(parsed.error, values);

  const { error } = await supabase.from("verification_requests").insert({
    profile_id: user.id,
    brand_id: kind === "brand" ? businessId : null,
    cafe_id: kind === "cafe" ? businessId : null,
    message: parsed.data.message,
    website: parsed.data.website,
  });
  if (error) return { message: databaseMessage(error), values };
  redirect("/panel/isletme");
}

/** The official account rewrites its business's description and links. */
export async function updateBusinessPage(
  kind: BusinessKind,
  businessId: string,
  _previous: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const { supabase } = await requireUser();
  const values = readValues(formData);
  if (!z.uuid().safeParse(businessId).success) return { message: e.invalid, values };
  const parsed = businessPageInputSchema.safeParse({
    description: values.description ?? "",
    website: values.website ?? "",
    district: values.district ?? "",
    mapUrl: values.mapUrl ?? "",
  });
  if (!parsed.success) return validationState(parsed.error, values);

  const { error } = await supabase.rpc("update_business_page_v1", {
    ...(kind === "brand" ? { p_brand_id: businessId } : { p_cafe_id: businessId }),
    p_description: parsed.data.description ?? undefined,
    p_website: parsed.data.website ?? undefined,
    ...(kind === "cafe"
      ? {
          p_district: parsed.data.district ?? undefined,
          p_map_url: parsed.data.mapUrl ?? undefined,
        }
      : {}),
  });
  if (error) return { message: databaseMessage(error), values };
  // The brand's and café's pages are built from the cached archive.
  refreshArchive();
  return { done: true, values };
}

/** Withdraws an application nobody has answered yet. */
export async function withdrawApplication(requestId: string): Promise<void> {
  const { supabase } = await requireUser();
  if (z.uuid().safeParse(requestId).success) {
    await supabase.from("verification_requests").delete().eq("id", requestId);
  }
  redirect("/panel/isletme");
}
