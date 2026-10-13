"use client";

import { LIST_DESCRIPTION_MAX_LENGTH, LIST_TITLE_MAX_LENGTH } from "@espressoir/core";
import { useActionState, useState } from "react";

import type { ListFormState } from "@/app/(account)/panel/listeler/actions";
import { CoffeePicker, type CoffeeOption } from "@/components/panel/coffee-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { format, t } from "@/lib/i18n";

const p = t.lists.panel;

/** A list's own fields: title, description, who may see it. For a new list or an edit. */
export function ListForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: ListFormState, formData: FormData) => Promise<ListFormState>;
  initial: { title: string; description: string; visibility: "public" | "private" };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const value = (name: "title" | "description" | "visibility") =>
    state.values?.[name] ?? initial[name];

  return (
    <form action={formAction} className="grid max-w-2xl gap-5 border-b border-border py-5">
      <Field label={p.name} htmlFor="list-title" error={state.errors?.title}>
        <Input
          id="list-title"
          name="title"
          required
          maxLength={LIST_TITLE_MAX_LENGTH}
          autoComplete="off"
          defaultValue={value("title")}
          aria-invalid={Boolean(state.errors?.title)}
        />
      </Field>
      <Field
        label={p.about}
        htmlFor="list-description"
        hint={format(p.aboutHint, { max: LIST_DESCRIPTION_MAX_LENGTH })}
        error={state.errors?.description}
      >
        <Textarea
          id="list-description"
          name="description"
          maxLength={LIST_DESCRIPTION_MAX_LENGTH}
          defaultValue={value("description")}
          className="min-h-24"
          aria-invalid={Boolean(state.errors?.description)}
        />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="label-caps mb-2 text-muted-foreground">{p.visibility}</legend>
        {(["public", "private"] as const).map((option) => (
          <label key={option} className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="visibility"
              value={option}
              defaultChecked={value("visibility") === option}
              className="size-4 accent-foreground"
            />
            {option === "public" ? p.visibilityPublic : p.visibilityPrivate}
          </label>
        ))}
      </fieldset>

      {state.message ? (
        <p
          role="alert"
          className="border-l-2 border-destructive pl-3 font-mono text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : state.saved ? (
        <p role="status" className="border-l-2 border-rule pl-3 font-mono text-sm">
          {p.saved}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending} className="h-11 px-8 font-mono text-xs uppercase">
          {pending ? p.saving : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Finds a coffee in the catalog and adds it to the list being edited. */
export function AddCoffeeToList({
  action,
  catalog,
}: {
  action: (formData: FormData) => Promise<void>;
  catalog: readonly CoffeeOption[];
}) {
  const [picked, setPicked] = useState<CoffeeOption | null>(null);
  const [missing, setMissing] = useState(false);

  return (
    <form action={action} className="grid max-w-2xl gap-3 border-b border-border py-5">
      <CoffeePicker
        catalog={catalog}
        picked={picked}
        onPick={(coffee) => {
          setPicked(coffee);
          setMissing(false);
        }}
        onAddNew={() => setMissing(true)}
      />
      <input type="hidden" name="coffeeId" value={picked?.id ?? ""} />
      {missing ? <p className="text-sm text-muted-foreground">{p.addMissing}</p> : null}
      <div>
        <Button
          type="submit"
          disabled={!picked}
          variant="outline"
          className="h-10 px-5 font-mono text-xs uppercase"
        >
          {p.addButton}
        </Button>
      </div>
    </form>
  );
}

/** Deleting cannot be undone, so the browser asks once before the action runs. */
export function DeleteList({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(p.deleteConfirm)) event.preventDefault();
      }}
    >
      <Button
        type="submit"
        variant="outline"
        className="h-11 border-destructive font-mono text-xs text-destructive uppercase hover:bg-destructive hover:text-white"
      >
        {p.delete}
      </Button>
    </form>
  );
}
