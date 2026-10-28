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
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { ToggleChip } from "@/components/ui/chip";
import { Field, Input, Label, Select } from "@/components/ui/field";
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

/** One chip per filter in use, each one click from being taken off. */
function activeChips(
  filter: CoffeeFilter,
  options: ExplorerOptions,
): { key: string; label: string; clear: Partial<CoffeeFilter> }[] {
  const nameOf = (list: { slug: string; name: string }[], slug: string) =>
    list.find((item) => item.slug === slug)?.name ?? slug;
  return [
    filter.query.trim()
      ? {
          key: "q",
          label: format(t.coffees.chipQuery, { query: filter.query.trim() }),
          clear: { query: "" },
        }
      : null,
    filter.brand
      ? { key: "brand", label: nameOf(options.brands, filter.brand), clear: { brand: null } }
      : null,
    filter.form ? { key: "form", label: t.coffee.forms[filter.form], clear: { form: null } } : null,
    filter.method
      ? { key: "method", label: nameOf(options.methods, filter.method), clear: { method: null } }
      : null,
    filter.minScore !== null
      ? {
          key: "min",
          label: format(t.coffees.chipMin, { score: filter.minScore }),
          clear: { minScore: null },
        }
      : null,
    filter.maxScore !== null
      ? {
          key: "max",
          label: format(t.coffees.chipMax, { score: filter.maxScore }),
          clear: { maxScore: null },
        }
      : null,
    filter.year !== null
      ? { key: "year", label: String(filter.year), clear: { year: null } }
      : null,
  ].filter((chip) => chip !== null);
}

/**
 * The coffee list with its filters. All coffees arrive with the (static) page, so
 * filtering happens here in the browser: no server work per visitor, and the state lives
 * in the URL so any view can be shared as a link. The search box leads; the other filters
 * sit beside it on a wide screen and behind "Filtreler" on a phone. Whatever is in use
 * shows as a chip that takes it off again.
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
  const chips = activeChips(filter, options);
  const [panelOpen, setPanelOpen] = useState(false);
  // The selects alone, without the search: how many of them are set.
  const selectCount = chips.filter((chip) => chip.key !== "q").length;

  // The History API keeps this a purely client-side update (Next.js syncs useSearchParams
  // with it), so typing in the search box never asks the server for anything.
  const update = (next: Partial<CoffeeFilter>, nextView: CoffeeView = view) => {
    const query = serializeCoffeeParams({ ...filter, ...next }, nextView);
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  };
  const clearAll = () => update({ ...DEFAULT_COFFEE_FILTER, sort: filter.sort });

  const numberOrNull = (value: string) => (value === "" ? null : Number(value));

  return (
    <div>
      <form
        role="search"
        aria-label={t.coffees.filters}
        className="flex flex-col gap-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label htmlFor="filter-q">{t.coffees.search}</Label>
            <div className="relative">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 stroke-[1.5] text-ink-2"
              />
              <Input
                id="filter-q"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={t.coffees.searchPlaceholder}
                value={filter.query}
                onChange={(event) => update({ query: event.target.value })}
                className="pl-12"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            aria-expanded={panelOpen}
            aria-controls="coffee-filters"
            className="md:hidden"
            onClick={() => setPanelOpen((open) => !open)}
          >
            <SlidersHorizontalIcon aria-hidden />
            {selectCount > 0
              ? format(t.coffees.showFiltersCount, { count: selectCount })
              : t.coffees.showFilters}
          </Button>
        </div>
        <div
          id="coffee-filters"
          className={cn(
            "grid grid-cols-2 gap-x-3 gap-y-4 rounded-lg border border-line bg-surface p-4 md:grid-cols-3 md:p-6 lg:grid-cols-6",
            !panelOpen && "max-md:hidden",
          )}
        >
          <Field
            label={t.coffees.brand}
            htmlFor="filter-brand"
            className="col-span-2 md:col-span-1"
          >
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
        </div>
      </form>

      {chips.length > 0 ? (
        <ul aria-label={t.coffees.activeLabel} className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full border border-sage-ink bg-sage-soft pr-2 pl-3 text-sm font-medium text-sage-ink transition-colors hover:bg-sunk"
                onClick={() => update(chip.clear)}
              >
                <span className="sr-only">{t.coffees.remove} </span>
                {chip.label}
                <XIcon aria-hidden className="size-4 stroke-2" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-6">
        <p className="type-meta" role="status" aria-live="polite">
          {active > 0
            ? format(t.coffees.resultCountFiltered, {
                count: visible.length,
                total: coffees.length,
              })
            : format(t.coffees.resultCount, { count: coffees.length })}
          {active > 0 ? (
            <button
              type="button"
              className="ml-3 cursor-pointer text-accent-ink underline underline-offset-3"
              onClick={clearAll}
            >
              {t.coffees.clear}
            </button>
          ) : null}
        </p>
        <div className="flex max-w-full flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="filter-sort" className="type-label">
              {t.coffees.sort}
            </label>
            <Select
              id="filter-sort"
              className="h-10 w-auto"
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
          <div role="group" aria-label={t.coffees.view} className="flex gap-2">
            {(["list", "cards"] as const).map((option) => (
              <ToggleChip
                key={option}
                aria-pressed={view === option}
                onClick={() => update({}, option)}
              >
                {option === "list" ? t.coffees.viewList : t.coffees.viewCards}
              </ToggleChip>
            ))}
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <CoffeeList coffees={visible} view={view} heading="h2" label={t.coffees.title} />
      ) : (
        <EmptyState
          icon={SearchIcon}
          title={t.coffees.empty}
          body={t.coffees.emptyHint}
          action={
            <Button type="button" variant="secondary" onClick={clearAll}>
              {t.coffees.clear}
            </Button>
          }
        />
      )}
    </div>
  );
}
