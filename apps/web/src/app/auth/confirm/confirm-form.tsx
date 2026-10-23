"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { confirmLink, type ConfirmState } from "./actions";

const initialState: ConfirmState = {};

export function ConfirmForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [state, action, pending] = useActionState(confirmLink, initialState);

  return (
    <form action={action} className="grid max-w-sm gap-6 py-6">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <p className="">{t.auth.link.body}</p>
      {state.error ? (
        <p role="alert" className="font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t.auth.link.submitting : t.auth.link.submit}
      </Button>
    </form>
  );
}
