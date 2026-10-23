"use client";

import { foldTurkish } from "@espressoir/core";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { cardClass } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { CafeCard } from "@/lib/data/cafes";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { CafeList } from "./cafe-list";

const c = t.cafes;

/**
 * The café list with its two filters, city and text. Like the coffee list it filters in
 * the browser, and the state lives in the URL (`?sehir=izmir&q=liman`), so a view can be
 * shared as a link.
 */
export function CafeExplorer({
  cafes,
  cities,
}: {
  cafes: CafeCard[];
  /** The cities that have cafés, in alphabetical order. */
  cities: { slug: string; name: string }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const city = cities.some((option) => option.slug === searchParams.get("sehir"))
    ? searchParams.get("sehir")!
    : "";
  const query = searchParams.get("q") ?? "";
  const visible = useMemo(() => {
    const wanted = foldTurkish(query.trim());
    return cafes.filter(
      (cafe) =>
        (city === "" || cafe.citySlug === city) &&
        (wanted === "" || cafe.searchText.includes(wanted)),
    );
  }, [cafes, city, query]);
  const active = (city ? 1 : 0) + (query.trim() ? 1 : 0);

  // The History API keeps this a purely client-side update, as on the coffee list. The
  // other filter is read from the address itself, not from this render: right after a
  // change the render may not have caught up yet, and a stale city would come back.
  const update = (next: { sehir?: string; q?: string }) => {
    const current = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    const sehir = next.sehir ?? current.get("sehir") ?? "";
    const q = next.q ?? current.get("q") ?? "";
    if (sehir) params.set("sehir", sehir);
    if (q) params.set("q", q);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `${pathname}?${search}` : pathname);
  };

  return (
    <div>
      <form
        role="search"
        aria-label={c.filters}
        className={cn(cardClass, "grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4")}
        onSubmit={(event) => event.preventDefault()}
      >
        <Field label={c.search} htmlFor="cafe-q" className="col-span-2">
          <Input
            id="cafe-q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={c.searchPlaceholder}
            value={query}
            onChange={(event) => update({ q: event.target.value })}
          />
        </Field>
        <Field label={c.city} htmlFor="cafe-city" className="col-span-2 md:col-span-1">
          <Select
            id="cafe-city"
            value={city}
            onChange={(event) => update({ sehir: event.target.value })}
          >
            <option value="">{c.allCities}</option>
            {cities.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>

      <p className="py-6 type-meta" role="status" aria-live="polite">
        {active > 0
          ? format(c.resultCountFiltered, { count: visible.length, total: cafes.length })
          : format(c.resultCount, { count: cafes.length })}
        {active > 0 ? (
          <button
            type="button"
            className="ml-3 cursor-pointer text-accent-ink underline underline-offset-3"
            onClick={() => update({ sehir: "", q: "" })}
          >
            {c.clear}
          </button>
        ) : null}
      </p>

      {visible.length > 0 ? (
        <CafeList cafes={visible} heading="h2" label={c.title} />
      ) : (
        <p className="py-8 text-ink-2">{c.empty}</p>
      )}
    </div>
  );
}
