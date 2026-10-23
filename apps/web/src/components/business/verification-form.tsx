"use client";

import { VERIFICATION_MESSAGE_MAX_LENGTH, WEBSITE_MAX_LENGTH } from "@espressoir/core";
import { useActionState } from "react";

import type { BusinessFormState } from "@/app/(account)/panel/isletme/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitWithoutReset } from "@/lib/form-submit";
import { format, t } from "@/lib/i18n";

const a = t.business.apply;

/** The application to become a business's official account. */
export function VerificationForm({
  action,
}: {
  action: (state: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const error = (name: string) => state.errors?.[name];

  return (
    <form
      action={formAction}
      onSubmit={submitWithoutReset(formAction)}
      className="grid max-w-2xl gap-4 py-6"
    >
      <Field
        label={a.message}
        htmlFor="message"
        hint={format(a.messageHint, { max: VERIFICATION_MESSAGE_MAX_LENGTH })}
        error={error("message")}
      >
        <Textarea
          id="message"
          name="message"
          required
          maxLength={VERIFICATION_MESSAGE_MAX_LENGTH}
          defaultValue={state.values?.message ?? ""}
          aria-invalid={Boolean(error("message"))}
        />
      </Field>
      <Field
        label={a.website}
        htmlFor="website"
        hint={t.business.panel.websiteHint}
        error={error("website")}
      >
        <Input
          id="website"
          name="website"
          type="url"
          inputMode="url"
          autoComplete="off"
          maxLength={WEBSITE_MAX_LENGTH}
          defaultValue={state.values?.website ?? ""}
          aria-invalid={Boolean(error("website"))}
        />
      </Field>
      {state.message ? (
        <p role="alert" className="font-medium text-danger">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? a.sending : a.send}
        </Button>
      </div>
    </form>
  );
}
