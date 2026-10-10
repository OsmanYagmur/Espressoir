"use client";

import {
  activeFilterCount,
  COFFEE_FORMS,
  COFFEE_SORTS,
  DEFAULT_COFFEE_FILTER,
  filterCoffees,
  SCORE_MAX,
  SCORE_MIN,
  type CoffeeFilter,
} from "@espressoir/core";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { CoffeeCard } from "@/lib/coffee-cards";
import {
  parseCoffeeParams,
  serializeCoffeeParams,
  type CoffeeView,
} from "@/lib/coffee-filter-params";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { CoffeeList } from "./coffee-list";

const SCORES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

export interface ExplorerOptions {
  brands: { slug: string; name: string }[];
  methods: { slug: string; name: string }[];
  years: number[];
}

/**
 * The coffee list with its filters. All coffees arrive with the (static) page, so
 * filtering happens here in the browser: no server work per visitor, and the state lives
 * in the URL so any view can be shared as a link.
 */
export function CoffeeExplorer({
  coffees,
  options,
}: {
  coffees: CoffeeCard[];
  options: ExplorerOptions;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filter, view } = useMemo(() => parseCoffeeParams(searchParams), [searchParams]);
  const visible = useMemo(() => filterCoffees(coffees, filter) as CoffeeCard[], [coffees, filter]);
  const active = activeFilterCount(filter);

  // The History API keeps this a purely client-side update (Next.js syncs useSearchParams
  // with it), so typing in the search box never asks the server for anything.
  const update = (next: Partial<CoffeeFilter>, nextView: CoffeeView = view) => {
    const query = serializeCoffeeParams({ ...filter, ...next }, nextView);
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };

  const numberOrNull = (value: string) => (value === "" ? null : Number(value));

  return (
    <div>
      <form
        role="search"
        aria-label={t.coffees.filters}
        className="grid grid-cols-2 gap-x-3 gap-y-4 border-b border-rule py-4 md:grid-cols-4 lg:grid-cols-8"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field label={t.coffees.search} htmlFor="filter-q" className="col-span-2">
          <Input
            id="filter-q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t.coffees.searchPlaceholder}
            value={filter.query}
            onChange={(event) => update({ query: event.target.value })}
          />
        </Field>
        <Field label={t.coffees.brand} htmlFor="filter-brand">
          <Select
            id="filter-brand"
            value={filter.brand ?? ""}
            onChange={(event) => update({ brand: event.target.value || null })}
          >
            <option value="">{t.coffees.all}</option>
            {options.brands.map((brand) => (
              <option key={brand.slug} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.coffees.form} htmlFor="filter-form">
          <Select
            id="filter-form"
            value={filter.form ?? ""}
            onChange={(event) =>
              update({ form: COFFEE_FORMS.find((form) => form === event.target.value) ?? null })
            }
          >
            <option value="">{t.coffees.all}</option>
            {COFFEE_FORMS.map((form) => (
              <option key={form} value={form}>
                {t.coffee.forms[form]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.coffees.method} htmlFor="filter-method">
          <Select
            id="filter-method"
            value={filter.method ?? ""}
            onChange={(event) => update({ method: event.target.value || null })}
          >
            <option value="">{t.coffees.all}</option>
            {options.methods.map((method) => (
              <option key={method.slug} value={method.slug}>
                {method.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.coffees.scoreMin} htmlFor="filter-min">
          <Select
            id="filter-min"
            value={filter.minScore ?? ""}
            onChange={(event) => update({ minScore: numberOrNull(event.target.value) })}
          >
            <option value="">{t.coffees.all}</option>
            {SCORES.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.coffees.scoreMax} htmlFor="filter-max">
          <Select
            id="filter-max"
            value={filter.maxScore ?? ""}
            onChange={(event) => update({ maxScore: numberOrNull(event.target.value) })}
          >
            <option value="">{t.coffees.all}</option>
            {SCORES.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.coffees.year} htmlFor="filter-year">
          <Select
            id="filter-year"
            value={filter.year ?? ""}
            onChange={(event) => update({ year: numberOrNull(event.target.value) })}
          >
            <option value="">{t.coffees.all}</option>
            {options.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
      </form>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-rule py-3">
        <p className="font-mono text-xs" role="status" aria-live="polite">
          {active > 0
            ? format(t.coffees.resultCountFiltered, {
                count: visible.length,
                total: coffees.length,
              })
            : format(t.coffees.resultCount, { count: coffees.length })}
          {active > 0 ? (
            <button
              type="button"
              className="ml-3 underline decoration-brand decoration-2 underline-offset-4 hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              onClick={() => update({ ...DEFAULT_COFFEE_FILTER, sort: filter.sort })}
            >
              {t.coffees.clear}
            </button>
          ) : null}
        </p>
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-sort" className="label-caps text-muted-foreground">
              {t.coffees.sort}
            </label>
            <Select
              id="filter-sort"
              className="h-9 w-auto"
              value={filter.sort}
              onChange={(event) =>
                update({
                  sort:
                    COFFEE_SORTS.find((sort) => sort === event.target.value) ??
                    DEFAULT_COFFEE_FILTER.sort,
                })
              }
            >
              {COFFEE_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t.coffees.sorts[sort]}
                </option>
              ))}
            </Select>
          </div>
          <div role="group" aria-label={t.coffees.view} className="flex">
            {(["list", "cards"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={view === option ? "default" : "outline"}
                aria-pressed={view === option}
                className={cn("h-9 font-mono text-xs uppercase", option === "cards" && "-ml-px")}
                onClick={() => update({}, option)}
              >
                {option === "list" ? t.coffees.viewList : t.coffees.viewCards}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <CoffeeList coffees={visible} view={view} label={t.coffees.title} />
      ) : (
        <p className="border-b border-border py-10 text-muted-foreground">{t.coffees.empty}</p>
      )}
    </div>
  );
}
