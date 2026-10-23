"use client";

import {
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  siteConfig,
} from "@espressoir/core";
import Link from "next/link";
import { useActionState } from "react";

import { FormMessage } from "@/components/account/form-message";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { format, t } from "@/lib/i18n";

import { completeOnboarding, type AccountFormState } from "../actions";

const o = t.onboarding;
const initialState: AccountFormState = {};
const HOST = new URL(siteConfig.url).host;

const legalLink = "text-accent-ink underline underline-offset-3";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  const value = (name: string) => state.values?.[name] ?? "";
  const error = (name: string) => state.errors?.[name];

  return (
    <form action={action} className="flex flex-col gap-6">
      <p>{o.intro}</p>

      <SectionHeading title={o.nameSection} className="mt-6 mb-0" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label={o.username}
          htmlFor="username"
          hint={format(o.usernameHint, { host: HOST })}
          error={error("username")}
          className="sm:col-span-2"
        >
          <Input
            id="username"
            name="username"
            defaultValue={value("username")}
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            required
            aria-invalid={error("username") ? true : undefined}
            aria-describedby={error("username") ? "username-error" : "username-hint"}
          />
        </Field>
        <Field
          label={o.displayName}
          htmlFor="displayName"
          hint={o.displayNameHint}
          error={error("displayName")}
          className="sm:col-span-2"
        >
          <Input
            id="displayName"
            name="displayName"
            defaultValue={value("displayName")}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            autoComplete="name"
            aria-invalid={error("displayName") ? true : undefined}
          />
        </Field>
      </div>

      <SectionHeading title={o.termsSection} className="mt-6 mb-0" />
      <div className="grid gap-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            defaultChecked={value("acceptTerms") === "on"}
            required
            className="mt-1 size-5 shrink-0 accent-accent"
            aria-describedby={error("acceptTerms") ? "acceptTerms-error" : undefined}
          />
          <span>
            {o.accept.before}
            <Link href="/kosullar" target="_blank" className={legalLink}>
              {o.accept.terms}
            </Link>
            {o.accept.between}
            <Link href="/kvkk" target="_blank" className={legalLink}>
              {o.accept.kvkk}
            </Link>
            {o.accept.after}
          </span>
        </label>
        {error("acceptTerms") ? (
          <p id="acceptTerms-error" role="alert" className="text-sm font-medium text-danger">
            {error("acceptTerms")}
          </p>
        ) : null}
        <p className="type-meta">{o.termsNote}</p>
      </div>

      <div className="grid gap-4 border-t border-line pt-6">
        <FormMessage>{state.message}</FormMessage>
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? o.submitting : o.submit}
        </Button>
      </div>
    </form>
  );
}
