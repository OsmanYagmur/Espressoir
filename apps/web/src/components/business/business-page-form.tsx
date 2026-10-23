"use client";

import {
  BUSINESS_DESCRIPTION_MAX_LENGTH,
  CAFE_DISTRICT_MAX_LENGTH,
  CAFE_MAP_URL_MAX_LENGTH,
  WEBSITE_MAX_LENGTH,
} from "@espressoir/core";
import { useActionState } from "react";

import type { BusinessFormState } from "@/app/(account)/panel/isletme/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitWithoutReset } from "@/lib/form-submit";
import { format, t } from "@/lib/i18n";

const f = t.business.panel;

/** A business's description and links, as its official account edits them. */
export function BusinessPageForm({
  action,
  initial,
  cafe,
  idPrefix,
}: {
  action: (state: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  initial: { description: string; website: string; district?: string; mapUrl?: string };
  /** Cafés also have a district and a map link. */
  cafe: boolean;
  /** Keeps ids unique when several forms share the page. */
  idPrefix: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (name: keyof typeof initial) => state.values?.[name] ?? initial[name] ?? "";
  const error = (name: string) => state.errors?.[name];
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset(formAction)}
      className="grid max-w-2xl gap-4 py-4"
    >
      <Field
        label={f.descriptionLabel}
        htmlFor={id("description")}
        hint={format(f.descriptionHint, { max: BUSINESS_DESCRIPTION_MAX_LENGTH })}
        error={error("description")}
      >
        <Textarea
          id={id("description")}
          name="description"
          maxLength={BUSINESS_DESCRIPTION_MAX_LENGTH}
          defaultValue={value("description")}
          aria-invalid={Boolean(error("description"))}
        />
      </Field>
      <Field
        label={t.business.website}
        htmlFor={id("website")}
        hint={f.websiteHint}
        error={error("website")}
      >
        <Input
          id={id("website")}
          name="website"
          type="url"
          inputMode="url"
          autoComplete="off"
          maxLength={WEBSITE_MAX_LENGTH}
          defaultValue={value("website")}
          aria-invalid={Boolean(error("website"))}
        />
      </Field>
      {cafe ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={f.district} htmlFor={id("district")} error={error("district")}>
            <Input
              id={id("district")}
              name="district"
              autoComplete="off"
              maxLength={CAFE_DISTRICT_MAX_LENGTH}
              defaultValue={value("district")}
            />
          </Field>
          <Field label={f.mapUrl} htmlFor={id("mapUrl")} error={error("mapUrl")}>
            <Input
              id={id("mapUrl")}
              name="mapUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              maxLength={CAFE_MAP_URL_MAX_LENGTH}
              defaultValue={value("mapUrl")}
              aria-invalid={Boolean(error("mapUrl"))}
            />
          </Field>
        </div>
      ) : null}
      {state.message ? (
        <p role="alert" className="font-medium text-danger">
          {state.message}
        </p>
      ) : state.done ? (
        <p role="status" className="rounded-md bg-sunk p-4">
          {f.saved}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? f.saving : f.save}
        </Button>
      </div>
    </form>
  );
}
