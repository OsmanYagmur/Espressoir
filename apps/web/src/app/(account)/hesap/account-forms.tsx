"use client";

import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_CHANGE_DAYS,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@espressoir/core";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/account/form-message";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { format, t } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/browser";

import { deleteAccount, updateProfile, type AccountFormState } from "./actions";

const a = t.account;
const initialState: AccountFormState = {};
const buttonClass = "h-11 justify-self-start px-6 font-mono text-xs uppercase";

export function ProfileForm({
  initial,
}: {
  initial: { username: string; displayName: string; bio: string };
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  // After a submit the form shows what was typed, not the original values.
  const value = (name: keyof typeof initial) => state.values?.[name] ?? initial[name];
  const error = (name: string) => state.errors?.[name];

  return (
    <form action={action} className="grid max-w-2xl gap-5 py-5">
      <Field
        label={a.username}
        htmlFor="username"
        hint={format(a.usernameHint, { days: USERNAME_CHANGE_DAYS })}
        error={error("username")}
      >
        <Input
          id="username"
          name="username"
          defaultValue={value("username")}
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          aria-invalid={error("username") ? true : undefined}
        />
      </Field>
      <Field label={a.displayName} htmlFor="displayName" error={error("displayName")}>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={value("displayName")}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          aria-invalid={error("displayName") ? true : undefined}
        />
      </Field>
      <Field
        label={a.bio}
        htmlFor="bio"
        hint={format(a.bioHint, { max: BIO_MAX_LENGTH })}
        error={error("bio")}
      >
        <Textarea
          id="bio"
          name="bio"
          defaultValue={value("bio")}
          maxLength={BIO_MAX_LENGTH}
          aria-invalid={error("bio") ? true : undefined}
        />
      </Field>
      <FormMessage>{state.message}</FormMessage>
      {state.saved ? <FormMessage tone="success">{a.saved}</FormMessage> : null}
      <Button type="submit" disabled={pending} className={buttonClass}>
        {pending ? a.saving : a.save}
      </Button>
    </form>
  );
}

/**
 * Downloads everything stored about the member as one JSON file. The browser asks the
 * database directly (the function returns only the caller's own data); nothing is kept on
 * a server in between.
 */
export function ExportDataButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setPending(true);
    setFailed(false);
    try {
      const supabase = getBrowserSupabase();
      // v2 adds comments, likes and reports; a database that predates it still has v1.
      let { data, error } = await supabase.rpc("export_my_data_v2");
      if (error?.code === "PGRST202") ({ data, error } = await supabase.rpc("export_my_data_v1"));
      if (error || !data) throw new Error(error?.message ?? "empty export");

      const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = `${a.exportFileName}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid max-w-2xl gap-4 py-5">
      <p className="max-w-[62ch] leading-relaxed">{a.exportBody}</p>
      {failed ? <FormMessage>{a.exportFailed}</FormMessage> : null}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        className={buttonClass}
        onClick={() => void download()}
      >
        {pending ? a.exporting : a.exportButton}
      </Button>
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, initialState);

  return (
    <form action={action} className="grid max-w-2xl gap-5 py-5">
      <p className="max-w-[62ch] leading-relaxed">{a.deleteBody}</p>
      <Field label={a.deleteConfirm} htmlFor="confirm" error={state.errors?.confirm}>
        <Input
          id="confirm"
          name="confirm"
          defaultValue={state.values?.confirm ?? ""}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          required
          aria-invalid={state.errors?.confirm ? true : undefined}
        />
      </Field>
      <FormMessage>{state.message}</FormMessage>
      <Button type="submit" variant="destructive" disabled={pending} className={buttonClass}>
        {pending ? a.deleting : a.deleteButton}
      </Button>
    </form>
  );
}
