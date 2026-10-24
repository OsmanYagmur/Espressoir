"use client";

import { WORKSHOP_EXPERIENCES } from "@espressoir/core";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import {
  applyToWorkshop,
  type ApplyField,
  type ApplyFormState,
} from "@/app/(site)/workshop/actions";
import { Button } from "@/components/ui/button";
import { describedBy, Field, FieldNote, Input, Optional, Textarea } from "@/components/ui/field";
import { submitWithoutReset } from "@/lib/form-submit";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const f = t.workshop.form;

/** The order the fields appear in: the first one with an error gets the focus. */
const FIELDS: readonly ApplyField[] = ["name", "contact", "experience", "question", "consent"];

const id = (field: ApplyField) => `basvuru-${field}`;

/**
 * ApplyForm (DESIGN.md): name and surname, a phone number, how you get on with coffee
 * (three option cards), an optional question, consent in one short line. Labels above, the error under its field in one
 * sentence; after a refused submit the first field to fix gets the focus. Once the
 * application is in, the thank-you note takes the form's place.
 *
 * `full`: the seats are gone; the form still works and the application joins the waitlist.
 */
export function ApplyForm({ workshopId, full }: { workshopId: string; full: boolean }) {
  const [state, dispatch, pending] = useActionState<ApplyFormState, FormData>(applyToWorkshop, {});
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
        className="rounded-md bg-leaf-soft p-4 font-medium text-leaf"
      >
        {t.workshop.success}
      </p>
    );
  }

  const errors = state.errors ?? {};
  const values = state.values ?? {};
  const aria = (field: ApplyField, hint?: string) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": describedBy(id(field), { error: errors[field], hint }),
  });

  return (
    <form
      ref={formRef}
      action={dispatch}
      onSubmit={submitWithoutReset(dispatch)}
      noValidate
      className="relative flex flex-col gap-6"
    >
      <input type="hidden" name="workshopId" value={workshopId} />
      {/* For programs that fill in every field; people never see or reach it. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          {f.honeypot}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.message ? (
        <p ref={messageRef} tabIndex={-1} role="alert" className="font-medium text-danger">
          {state.message}
        </p>
      ) : null}

      <Field label={f.name} htmlFor={id("name")} error={errors.name}>
        <Input
          id={id("name")}
          name="name"
          autoComplete="name"
          defaultValue={values.name}
          {...aria("name")}
        />
      </Field>

      <Field label={f.contact} htmlFor={id("contact")} hint={f.contactHint} error={errors.contact}>
        <Input
          id={id("contact")}
          name="contact"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={values.contact}
          {...aria("contact", f.contactHint)}
        />
      </Field>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend id={`${id("experience")}-label`} className="mb-2 type-label">
          {f.experience}
        </legend>
        <div
          role="radiogroup"
          aria-labelledby={`${id("experience")}-label`}
          className="flex flex-col gap-2"
          {...aria("experience")}
        >
          {WORKSHOP_EXPERIENCES.map((experience) => (
            <label
              key={experience}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border border-line-strong bg-surface px-4 py-3 transition-colors has-checked:border-accent has-checked:ring-1 has-checked:ring-accent has-checked:ring-inset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                errors.experience && "border-danger",
              )}
            >
              <input
                type="radio"
                name="experience"
                value={experience}
                defaultChecked={values.experience === experience}
                className="mt-1 size-4.5 flex-none accent-accent focus-visible:outline-none"
              />
              <span className="flex flex-col">
                <span className="font-semibold">{f.experiences[experience].title}</span>
                <span className="type-meta">{f.experiences[experience].hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldNote id={id("experience")} error={errors.experience} />
      </fieldset>

      <Field
        label={
          <>
            {f.question} <Optional>{f.optional}</Optional>
          </>
        }
        htmlFor={id("question")}
        error={errors.question}
      >
        <Textarea
          id={id("question")}
          name="question"
          defaultValue={values.question}
          {...aria("question")}
        />
      </Field>

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
              href={"/kvkk#atolye-basvurulari" as Route}
              prefetch={false}
              className="text-accent-ink underline underline-offset-3"
            >
              {f.consentLink}
            </Link>
          </span>
        </label>
        <FieldNote id={id("consent")} error={errors.consent} />
      </div>

      <Button type="submit" block disabled={pending} className="md:w-auto md:self-start">
        {pending ? f.sending : full ? f.submitWaitlist : f.submit}
      </Button>
    </form>
  );
}
