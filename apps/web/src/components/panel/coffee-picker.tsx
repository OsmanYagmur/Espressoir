"use client";

import { foldTurkish } from "@espressoir/core";
import { useEffect, useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const f = t.panel.form;

export interface CoffeeOption {
  id: string;
  label: string;
}

const MIN_QUERY = 2;

/** Used when the database cannot be asked (offline preview): plain "contains" matching. */
function searchLocally(catalog: readonly CoffeeOption[], query: string, limit: number) {
  const wanted = foldTurkish(query);
  return catalog.filter((coffee) => foldTurkish(coffee.label).includes(wanted)).slice(0, limit);
}

/**
 * Coffees resembling `query`, from the database's trigram search (it tolerates typos and
 * Turkish letter variants). Asked a moment after typing stops. `settled` is false while
 * the answer on screen belongs to an earlier query.
 */
function useCoffeeMatches(query: string, catalog: readonly CoffeeOption[], limit: number) {
  const text = query.trim();
  const [answer, setAnswer] = useState<{ query: string; matches: CoffeeOption[] } | null>(null);

  useEffect(() => {
    if (text.length < MIN_QUERY) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let matches: CoffeeOption[];
      try {
        const { data, error } = await getBrowserSupabase().rpc("search_coffees_v1", {
          p_query: text,
          p_limit: limit,
        });
        if (error) throw error;
        matches = data.map((row) => ({
          id: row.coffee_id,
          label: `${row.brand_name} — ${row.coffee_name}`,
        }));
      } catch {
        matches = searchLocally(catalog, text, limit);
      }
      if (!cancelled) setAnswer({ query: text, matches });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, catalog, limit]);

  if (text.length < MIN_QUERY) return { matches: [], settled: false };
  return { matches: answer?.matches ?? [], settled: answer?.query === text };
}

const optionButton =
  "w-full border border-input px-3 py-2.5 text-left font-mono text-sm hover:border-foreground focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";
const quietButton =
  "font-mono text-xs underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Choosing a coffee that is already in the catalog: type a few letters, pick from the
 * matches. The chosen coffee's id travels with the form as `coffeeId`.
 */
export function CoffeePicker({
  catalog,
  picked,
  onPick,
  onAddNew,
  error,
}: {
  catalog: readonly CoffeeOption[];
  picked: CoffeeOption | null;
  onPick: (coffee: CoffeeOption | null) => void;
  /** The visitor could not find it: start a new coffee with what they typed. */
  onAddNew: (query: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const { matches, settled } = useCoffeeMatches(query, catalog, 8);

  if (picked) {
    return (
      <div className="grid gap-1.5">
        <span className="label-caps text-muted-foreground">{f.chosenCoffee}</span>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border border-foreground px-3 py-2.5">
          <span className="font-semiwide font-bold [overflow-wrap:anywhere]">{picked.label}</span>
          <button type="button" className={quietButton} onClick={() => onPick(null)}>
            {f.changeCoffee}
          </button>
        </div>
        <input type="hidden" name="coffeeId" value={picked.id} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Field label={f.searchCoffee} htmlFor="coffeeSearch" hint={f.searchHint} error={error}>
        <Input
          id="coffeeSearch"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter belongs to the search here, not to the whole form.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          aria-invalid={Boolean(error)}
          aria-controls="coffee-matches"
        />
      </Field>
      <input type="hidden" name="coffeeId" value="" />
      <div id="coffee-matches" aria-live="polite">
        {matches.length > 0 ? (
          <ul aria-label={f.searchResults} className="grid gap-1.5">
            {matches.map((coffee) => (
              <li key={coffee.id}>
                <button type="button" className={optionButton} onClick={() => onPick(coffee)}>
                  {coffee.label}
                </button>
              </li>
            ))}
          </ul>
        ) : settled ? (
          <p className="font-mono text-sm text-muted-foreground">{f.searchEmpty}</p>
        ) : null}
        {settled ? (
          <button
            type="button"
            className={`${quietButton} mt-3`}
            onClick={() => onAddNew(query.trim())}
          >
            {f.addAsNew}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Shown while a new coffee is being typed in: coffees already in the catalog that look
 * like it. The same coffee entered twice splits its tastings, so this asks first.
 */
export function SimilarCoffees({
  brandName,
  coffeeName,
  catalog,
  onPick,
}: {
  brandName: string;
  coffeeName: string;
  catalog: readonly CoffeeOption[];
  onPick: (coffee: CoffeeOption) => void;
}) {
  const ready = brandName.trim().length >= MIN_QUERY && coffeeName.trim().length >= MIN_QUERY;
  const { matches } = useCoffeeMatches(ready ? `${brandName} ${coffeeName}` : "", catalog, 3);
  if (matches.length === 0) return null;

  return (
    <div role="status" className="grid gap-2 border-2 border-brand p-3">
      <p className="font-mono text-sm">{f.similarTitle}</p>
      <ul aria-label={f.similarTitle} className="grid gap-1.5">
        {matches.map((coffee) => (
          <li key={coffee.id} className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-semiwide font-bold [overflow-wrap:anywhere]">{coffee.label}</span>
            <button type="button" className={quietButton} onClick={() => onPick(coffee)}>
              {f.similarPick}
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-xs text-muted-foreground">{f.similarHint}</p>
    </div>
  );
}
