"use client";

import { LIST_TITLE_MAX_LENGTH } from "@espressoir/core";
import { CheckIcon, PlusIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import {
  createListWith,
  setWantToTry,
  toggleListItem,
} from "@/app/(account)/panel/listeler/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";

import type { CoffeeShelf } from "./list-data";

const l = t.lists;

/** The page's main action: a tasting of this coffee (the form opens with it chosen). */
function AddTasting({ coffeeId, signedIn }: { coffeeId: string; signedIn: boolean }) {
  return (
    <Button asChild>
      <Link
        href={signedIn ? (`/panel/tadim/yeni/${coffeeId}` as Route) : "/giris"}
        prefetch={false}
      >
        <PlusIcon aria-hidden />
        {t.nav.addTasting}
      </Link>
    </Button>
  );
}

/**
 * What a member can do with a coffee: add a tasting of it (the page's one primary action),
 * put it on their "want to try" list with one click (a status of their own, shown on their
 * profile), and add it to (or take it off) the lists they made themselves.
 *
 * The page is static and the same for everyone, so this works out in the browser who is
 * looking. Visitors get links to the login; for a member the current state is read from
 * Supabase and every change goes through a Server Action, which also refreshes the public
 * pages the change shows up on.
 */
export function CoffeeActions({ coffeeId }: { coffeeId: string }) {
  const signedIn = useHasSession();
  const panelId = useId();
  const [shelf, setShelf] = useState<CoffeeShelf | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const { loadCoffeeShelf } = await import("./list-data");
        const loaded = await loadCoffeeShelf(coffeeId);
        if (!cancelled) setShelf(loaded);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, coffeeId]);

  if (!signedIn) {
    return (
      <div className="flex flex-wrap gap-2">
        <AddTasting coffeeId={coffeeId} signedIn={false} />
        <Button asChild variant="secondary">
          <Link href="/giris" prefetch={false}>
            {l.want.add}
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/giris" prefetch={false}>
            {l.add.open}
          </Link>
        </Button>
      </div>
    );
  }
  // Signed in, but the state is not known yet (or could not be read): nothing to offer.
  if (!shelf) {
    return failed ? (
      <p role="alert" className="font-medium text-danger">
        {l.add.failed}
      </p>
    ) : (
      <div className="flex flex-wrap gap-2">
        <AddTasting coffeeId={coffeeId} signedIn />
      </div>
    );
  }

  /** Runs one change: shows it at once, takes it back if the server refuses. */
  async function change(
    next: CoffeeShelf,
    send: () => Promise<{ ok: true } | { ok: false; message: string }>,
  ) {
    const before = shelf;
    setShelf(next);
    setBusy(true);
    setError(null);
    try {
      const result = await send();
      if (!result.ok) {
        setShelf(before);
        setError(result.message);
      }
    } catch {
      setShelf(before);
      setError(l.add.failed);
    } finally {
      setBusy(false);
    }
  }

  const toggleWant = () =>
    change({ ...shelf, wantsToTry: !shelf.wantsToTry }, () =>
      setWantToTry(coffeeId, !shelf.wantsToTry),
    );

  const toggleList = (listId: string, on: boolean) =>
    change(
      {
        ...shelf,
        lists: shelf.lists.map((list) => (list.id === listId ? { ...list, has: on } : list)),
      },
      () => toggleListItem(listId, coffeeId, on),
    );

  async function create() {
    if (title.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const result = await createListWith(title, coffeeId);
      if (result.ok) {
        setShelf({
          ...shelf!,
          lists: [
            { id: result.list.id, title: result.list.title, isPublic: true, has: true },
            ...shelf!.lists,
          ],
        });
        setTitle("");
      } else {
        setError(result.message);
      }
    } catch {
      setError(l.add.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <AddTasting coffeeId={coffeeId} signedIn />
        <Button
          type="button"
          variant="secondary"
          aria-pressed={shelf.wantsToTry}
          disabled={busy}
          className="aria-pressed:border-sage-ink aria-pressed:bg-sage-soft aria-pressed:text-sage-ink aria-pressed:hover:bg-sage-soft"
          onClick={() => void toggleWant()}
        >
          {shelf.wantsToTry ? <CheckIcon aria-hidden /> : null}
          {shelf.wantsToTry ? l.want.added : l.want.add}
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          {l.add.open}
        </Button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="mt-4 grid max-w-md gap-4 rounded-lg border border-line bg-surface p-4"
        >
          <fieldset disabled={busy} className="grid gap-2">
            <legend className="mb-2 type-label">{l.add.title}</legend>
            {shelf.lists.length === 0 ? (
              <p className="type-meta">{l.add.none}</p>
            ) : (
              shelf.lists.map((list) => (
                <label key={list.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-4.5 accent-accent"
                    checked={list.has}
                    onChange={(event) => void toggleList(list.id, event.target.checked)}
                  />
                  <span className="[overflow-wrap:anywhere]">{list.title}</span>
                  {list.isPublic ? null : <span className="type-meta">({l.private})</span>}
                </label>
              ))
            )}
          </fieldset>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label htmlFor={`${panelId}-new`} className="type-label">
              {l.add.newLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              <Input
                id={`${panelId}-new`}
                value={title}
                maxLength={LIST_TITLE_MAX_LENGTH}
                placeholder={l.add.newPlaceholder}
                autoComplete="off"
                onChange={(event) => setTitle(event.target.value)}
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="secondary" disabled={busy || title.trim() === ""}>
                {l.add.create}
              </Button>
            </div>
          </form>
          <Link
            href="/panel/listeler"
            prefetch={false}
            className="text-accent-ink underline underline-offset-3"
          >
            {l.add.manage}
          </Link>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
