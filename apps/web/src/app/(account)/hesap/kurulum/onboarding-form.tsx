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

const legalLink =
  "underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, initialState);
  const value = (name: string) => state.values?.[name] ?? "";
  const error = (name: string) => state.errors?.[name];

  return (
    <form action={action} className="max-w-2xl pb-10">
      <p className="max-w-[62ch] py-5 leading-relaxed">{o.intro}</p>

      <SectionHeading index={1} title={o.nameSection} />
      <div className="grid gap-5 py-5 sm:grid-cols-2">
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

      <SectionHeading index={2} title={o.termsSection} />
      <div className="grid gap-3 py-5">
        <label className="flex items-start gap-3 leading-relaxed">
          <input
            type="checkbox"
            name="acceptTerms"
            defaultChecked={value("acceptTerms") === "on"}
            required
            className="mt-1 size-5 shrink-0 accent-foreground"
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
          <p id="acceptTerms-error" role="alert" className="font-mono text-xs text-destructive">
            {error("acceptTerms")}
          </p>
        ) : null}
        <p className="font-mono text-xs text-muted-foreground">{o.termsNote}</p>
      </div>

      <div className="grid gap-4 border-t border-rule pt-5">
        <FormMessage>{state.message}</FormMessage>
        <Button
          type="submit"
          disabled={pending}
          className="h-11 justify-self-start px-8 font-mono text-xs uppercase"
        >
          {pending ? o.submitting : o.submit}
        </Button>
      </div>
    </form>
  );
}
