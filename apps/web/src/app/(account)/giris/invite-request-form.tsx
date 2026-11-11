"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { describedBy, Field, FieldNote, Input, Optional, Textarea } from "@/components/ui/field";
import { submitWithoutReset } from "@/lib/form-submit";
import { t } from "@/lib/i18n";

import { requestInvite, type InviteField, type InviteFormState } from "./invite-actions";

const f = t.auth.invite;

/** The order the fields appear in: the first one with an error gets the focus. */
const FIELDS: readonly InviteField[] = ["email", "note", "consent"];

const id = (field: InviteField) => `davet-${field}`;

/**
 * "Davet iste": while signup is closed, a visitor leaves an address and, if they like, a
 * sentence; the owner sends the invitation from the admin panel. Labels above, the error
 * under its field; once the request is in, the thank-you note takes the form's place.
 */
export function InviteRequestForm() {
  const [state, dispatch, pending] = useActionState<InviteFormState, FormData>(requestInvite, {});
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.done) {
      doneRef.current?.focus();
      return;
    }
    const first = FIELDS.find((field) => state.errors?.[field]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    } else if (state.message) {
      messageRef.current?.focus();
    }
  }, [state]);

  if (state.done) {
    return (
      <p
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-md bg-sage-soft p-4 font-medium text-sage-ink"
      >
        {f.done}
      </p>
    );
  }

  const errors = state.errors ?? {};
  const values = state.values ?? {};
  const aria = (field: InviteField, hint?: string) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": describedBy(id(field), { error: errors[field], hint }),
  });

  return (
    <form
      ref={formRef}
      action={dispatch}
      onSubmit={submitWithoutReset(dispatch)}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.message ? (
        <p ref={messageRef} tabIndex={-1} role="alert" className="font-medium text-danger">
          {state.message}
        </p>
      ) : null}

      <Field label={f.email} htmlFor={id("email")} error={errors.email}>
        <Input
          id={id("email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={values.email}
          {...aria("email")}
        />
      </Field>

      <Field
        label={
          <>
            {f.note} <Optional>{f.optional}</Optional>
          </>
        }
        htmlFor={id("note")}
        hint={f.noteHint}
        error={errors.note}
      >
        <Textarea
          id={id("note")}
          name="note"
          defaultValue={values.note}
          {...aria("note", f.noteHint)}
        />
      </Field>

      {/* Off screen and skipped by the keyboard: only a program fills it in. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 type-meta">
          <input
            type="checkbox"
            name="consent"
            className="mt-1 size-4.5 flex-none accent-accent"
            {...aria("consent")}
          />
          <span>
            {f.consent}{" "}
            <Link
              href={"/kvkk#davet-istekleri" as Route}
              prefetch={false}
              className="text-accent-ink underline underline-offset-3"
            >
              {f.consentLink}
            </Link>
          </span>
        </label>
        <FieldNote id={id("consent")} error={errors.consent} />
      </div>

      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? f.sending : f.submit}
      </Button>
    </form>
  );
}
