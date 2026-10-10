"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { t } from "@/lib/i18n";

import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="grid max-w-sm gap-5 py-6">
      <Field label={t.auth.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.email}
        />
      </Field>
      <Field label={t.auth.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {state.error ? (
        <p
          role="alert"
          className="border-l-2 border-destructive pl-3 font-mono text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-11 font-mono text-xs uppercase">
        {pending ? t.auth.submitting : t.auth.submit}
      </Button>
    </form>
  );
}
