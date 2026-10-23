"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? t.panel.form.deleting : label}
    </Button>
  );
}

/**
 * Deleting cannot be undone, so the browser asks once before the action runs. A tasting by
 * default; a café visit passes its own wording.
 */
export function DeleteTasting({
  action,
  label = t.panel.form.delete,
  confirmText = t.panel.form.deleteConfirm,
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <Submit label={label} />
    </form>
  );
}
