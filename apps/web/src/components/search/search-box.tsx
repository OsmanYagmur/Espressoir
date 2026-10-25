"use client";

import { prepareSearch, search, type PreparedEntry, type SearchEntry } from "@espressoir/core";
import { SearchIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { format, t } from "@/lib/i18n";

const s = t.search;

/** Moves the focus along the results with the arrow keys, back to the box with Escape. */
function moveFocus(
  event: React.KeyboardEvent,
  list: HTMLElement | null,
  input: HTMLElement | null,
) {
  const links = [...(list?.querySelectorAll<HTMLAnchorElement>("a[data-result]") ?? [])];
  const at = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (event.key === "ArrowDown") {
    event.preventDefault();
    links[Math.min(at + 1, links.length - 1)]?.focus();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (at <= 0) input?.focus();
    else links[at - 1]?.focus();
  } else if (event.key === "Escape" && at !== -1) {
    input?.focus();
  }
}

function Results({ index, query }: { index: PreparedEntry[]; query: string }) {
  const groups = useMemo(() => search(index, query), [index, query]);
  const count = groups.reduce((sum, group) => sum + group.total, 0);
  return (
    <>
      {/* One line, read out as it changes: the count, or (shown) that nothing matched. */}
      <p role="status" className={query.trim() && count === 0 ? "text-ink-2" : "sr-only"}>
        {query.trim()
          ? count > 0
            ? format(s.results, { count })
            : format(s.empty, { query: query.trim() })
          : ""}
      </p>
      {groups.map((group) => (
        <section
          key={group.kind}
          aria-labelledby={`sonuc-${group.kind}`}
          className="flex flex-col gap-2"
        >
          <h2 id={`sonuc-${group.kind}`} className="type-label text-ink-2">
            {s.kinds[group.kind]}
          </h2>
          <ul className="flex flex-col border-y border-line">
            {group.entries.map((entry) => (
              <li key={entry.href} className="border-line not-first:border-t">
                <Link
                  href={entry.href as Route}
                  prefetch={false}
                  data-result
                  className="flex flex-col gap-0.5 rounded-sm px-2 py-3 text-ink no-underline transition-colors hover:bg-sunk focus-visible:bg-sunk"
                >
                  <span className="font-semibold [overflow-wrap:anywhere]">{entry.title}</span>
                  {entry.detail ? (
                    <span className="line-clamp-1 type-meta">{entry.detail}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {group.total > group.entries.length ? (
            <p className="type-meta">
              {format(s.more, { count: group.total - group.entries.length })}
            </p>
          ) : null}
        </section>
      ))}
    </>
  );
}

/**
 * The search box and what it finds, as the visitor types: grouped (articles, coffees,
 * brands, cafés, members), each result one link. The words stay in the address (`?q=`),
 * so a search can be shared or reopened; arrow keys walk the results. While the box is
 * empty, `children` (a few ways in) stands in for the results.
 */
export function SearchBox({
  entries,
  children,
}: {
  entries: readonly SearchEntry[];
  children?: React.ReactNode;
}) {
  const index = useMemo(() => prepareSearch(entries), [entries]);
  const initial = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  function change(value: string) {
    setQuery(value);
    const url = value.trim() ? `?q=${encodeURIComponent(value)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  return (
    <div
      className="flex flex-col gap-8"
      onKeyDown={(event) => moveFocus(event, list.current, input.current)}
    >
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-2"
      >
        <label htmlFor="arama" className="type-label">
          {s.label}
        </label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 stroke-[1.5] text-ink-2"
          />
          <input
            ref={input}
            id="arama"
            type="search"
            name="q"
            value={query}
            onChange={(event) => change(event.target.value)}
            placeholder={s.placeholder}
            autoComplete="off"
            enterKeyHint="search"
            autoFocus
            className="h-14 w-full rounded-md border border-line-strong bg-surface pr-4 pl-12 text-lg text-ink transition-colors placeholder:text-ink-3"
          />
        </div>
        <p className="type-meta">{s.hint}</p>
      </form>
      <div ref={list} className="flex flex-col gap-8">
        {query.trim() ? <Results index={index} query={query} /> : children}
      </div>
    </div>
  );
}
