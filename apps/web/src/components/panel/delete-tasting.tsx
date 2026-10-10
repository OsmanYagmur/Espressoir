"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="h-11 border-destructive font-mono text-xs text-destructive uppercase hover:bg-destructive hover:text-white"
    >
      {pending ? t.panel.form.deleting : t.panel.form.delete}
    </Button>
  );
}

/** Deleting cannot be undone, so the browser asks once before the action runs. */
export function DeleteTasting({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(t.panel.form.deleteConfirm)) event.preventDefault();
      }}
    >
      <Submit />
    </form>
  );
}
