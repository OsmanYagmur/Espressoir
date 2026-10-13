"use client";

import { LIST_TITLE_MAX_LENGTH } from "@espressoir/core";
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
const buttonClass = "h-10 px-4 font-mono text-xs uppercase";

/**
 * What a member can do with a coffee besides tasting it: put it on their "want to try"
 * list with one click, and add it to (or take it off) their own lists.
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
      <div className="flex flex-wrap gap-2 border-b border-border py-3">
        <Button asChild variant="outline" className={buttonClass}>
          <Link href="/giris" prefetch={false}>
            {l.want.add}
          </Link>
        </Button>
        <Button asChild variant="outline" className={buttonClass}>
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
      <p role="alert" className="border-b border-border py-3 font-mono text-xs text-destructive">
        {l.add.failed}
      </p>
    ) : (
      <div className="border-b border-border py-3" aria-hidden>
        <div className="h-10" />
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
    <div className="border-b border-border py-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={shelf.wantsToTry ? "default" : "outline"}
          aria-pressed={shelf.wantsToTry}
          disabled={busy}
          className={buttonClass}
          onClick={() => void toggleWant()}
        >
          {shelf.wantsToTry ? l.want.added : l.want.add}
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls={panelId}
          className={buttonClass}
          onClick={() => setOpen(!open)}
        >
          {l.add.open}
        </Button>
      </div>

      {open ? (
        <div id={panelId} className="mt-3 grid max-w-md gap-3 border border-border p-4">
          <fieldset disabled={busy} className="grid gap-2">
            <legend className="label-caps mb-2 text-muted-foreground">{l.add.title}</legend>
            {shelf.lists.length === 0 ? (
              <p className="text-sm text-muted-foreground">{l.add.none}</p>
            ) : (
              shelf.lists.map((list) => (
                <label key={list.id} className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-foreground"
                    checked={list.has}
                    onChange={(event) => void toggleList(list.id, event.target.checked)}
                  />
                  <span className="[overflow-wrap:anywhere]">{list.title}</span>
                  {list.isPublic ? null : (
                    <span className="font-mono text-xs text-muted-foreground">({l.private})</span>
                  )}
                </label>
              ))
            )}
          </fieldset>
          <form
            className="grid gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label htmlFor={`${panelId}-new`} className="label-caps text-muted-foreground">
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
                className="h-10 min-w-0 flex-1"
              />
              <Button type="submit" disabled={busy || title.trim() === ""} className={buttonClass}>
                {l.add.create}
              </Button>
            </div>
          </form>
          <Link
            href="/panel/listeler"
            prefetch={false}
            className="font-mono text-xs underline underline-offset-4"
          >
            {l.add.manage} →
          </Link>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 font-mono text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
