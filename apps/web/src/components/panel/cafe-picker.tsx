"use client";

import { cityByCode, foldTurkish } from "@espressoir/core";
import { useEffect, useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const f = t.cafes.panel;

export interface CafeOption {
  id: string;
  /** "Name — District, City". */
  label: string;
  cityCode: number;
}

const MIN_QUERY = 2;

/** Used when the database cannot be asked (offline preview): plain "contains" matching. */
function searchLocally(
  catalog: readonly CafeOption[],
  query: string,
  cityCode: number | null,
  limit: number,
) {
  const wanted = foldTurkish(query);
  return catalog
    .filter((cafe) => cityCode === null || cafe.cityCode === cityCode)
    .filter((cafe) => foldTurkish(cafe.label).includes(wanted))
    .slice(0, limit);
}

/**
 * Cafés resembling `query` (optionally in one city), from the database's trigram search,
 * asked a moment after typing stops. `settled` is false while the answer on screen
 * belongs to an earlier query. The same hook as the coffee picker's, for cafés.
 */
function useCafeMatches(
  query: string,
  cityCode: number | null,
  catalog: readonly CafeOption[],
  limit: number,
) {
  const text = query.trim();
  const key = `${cityCode ?? ""}|${text}`;
  const [answer, setAnswer] = useState<{ key: string; matches: CafeOption[] } | null>(null);

  useEffect(() => {
    if (text.length < MIN_QUERY) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let matches: CafeOption[];
      try {
        const { data, error } = await getBrowserSupabase().rpc("search_cafes_v1", {
          p_query: text,
          p_city_code: cityCode ?? undefined,
          p_limit: limit,
        });
        if (error) throw error;
        matches = data.map((row) => ({
          id: row.cafe_id,
          label: `${row.cafe_name} — ${[row.district, cityByCode(row.city_code)?.name]
            .filter(Boolean)
            .join(", ")}`,
          cityCode: row.city_code,
        }));
      } catch {
        matches = searchLocally(catalog, text, cityCode, limit);
      }
      if (!cancelled) setAnswer({ key: `${cityCode ?? ""}|${text}`, matches });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, cityCode, catalog, limit]);

  if (text.length < MIN_QUERY) return { matches: [], settled: false };
  return { matches: answer?.matches ?? [], settled: answer?.key === key };
}

const optionButton =
  "w-full border border-input px-3 py-2.5 text-left font-mono text-sm hover:border-foreground focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";
const quietButton =
  "font-mono text-xs underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Choosing a café that is already listed: type a few letters of its name or district,
 * pick from the matches. The chosen café's id travels with the form as `cafeId`.
 */
export function CafePicker({
  catalog,
  picked,
  onPick,
  onAddNew,
  error,
}: {
  catalog: readonly CafeOption[];
  picked: CafeOption | null;
  onPick: (cafe: CafeOption | null) => void;
  /** Not found: start a new café with what was typed. */
  onAddNew: (query: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const { matches, settled } = useCafeMatches(query, null, catalog, 8);

  if (picked) {
    return (
      <div className="grid gap-1.5">
        <span className="label-caps text-muted-foreground">{f.chosenCafe}</span>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border border-foreground px-3 py-2.5">
          <span className="font-semiwide font-bold [overflow-wrap:anywhere]">{picked.label}</span>
          <button type="button" className={quietButton} onClick={() => onPick(null)}>
            {f.changeCafe}
          </button>
        </div>
        <input type="hidden" name="cafeId" value={picked.id} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Field label={f.searchCafe} htmlFor="cafeSearch" hint={f.searchHint} error={error}>
        <Input
          id="cafeSearch"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter belongs to the search here, not to the whole form.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          aria-invalid={Boolean(error)}
          aria-controls="cafe-matches"
        />
      </Field>
      <input type="hidden" name="cafeId" value="" />
      <div id="cafe-matches" aria-live="polite">
        {matches.length > 0 ? (
          <ul aria-label={f.searchResults} className="grid gap-1.5">
            {matches.map((cafe) => (
              <li key={cafe.id}>
                <button type="button" className={optionButton} onClick={() => onPick(cafe)}>
                  {cafe.label}
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
 * Shown while a new café is being typed in: cafés in the same city with a similar name.
 * The same café entered twice splits its visits, so this asks first.
 */
export function SimilarCafes({
  name,
  cityCode,
  catalog,
  onPick,
}: {
  name: string;
  cityCode: number | null;
  catalog: readonly CafeOption[];
  onPick: (cafe: CafeOption) => void;
}) {
  const ready = name.trim().length >= MIN_QUERY && cityCode !== null;
  const { matches } = useCafeMatches(ready ? name : "", cityCode, catalog, 3);
  if (matches.length === 0) return null;

  return (
    <div role="status" className="grid gap-2 border-2 border-brand p-3">
      <p className="font-mono text-sm">{f.similarTitle}</p>
      <ul aria-label={f.similarTitle} className="grid gap-1.5">
        {matches.map((cafe) => (
          <li key={cafe.id} className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-semiwide font-bold [overflow-wrap:anywhere]">{cafe.label}</span>
            <button type="button" className={quietButton} onClick={() => onPick(cafe)}>
              {f.similarPick}
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-xs text-muted-foreground">{f.similarHint}</p>
    </div>
  );
}
