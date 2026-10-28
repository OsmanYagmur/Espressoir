"use client";

import {
  ChartColumnIcon,
  ChevronDownIcon,
  CoffeeIcon,
  NotebookPenIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** What "Keşfet" opens: the archive's pages, each with what it holds. */
const EXPLORE_ITEMS: ReadonlyArray<{ href: Route; label: string; hint: string; icon: LucideIcon }> =
  [
    { href: "/kahveler", label: t.nav.coffees, hint: t.nav.hints.coffees, icon: CoffeeIcon },
    { href: "/akis", label: t.nav.feed, hint: t.nav.hints.feed, icon: NotebookPenIcon },
    { href: "/kafeler", label: t.nav.cafes, hint: t.nav.hints.cafes, icon: StoreIcon },
    { href: "/istatistik", label: t.nav.stats, hint: t.nav.hints.stats, icon: ChartColumnIcon },
  ];

/** Pages that belong under "Keşfet": the lists above and what they lead to. */
const EXPLORE_AREA = /^\/(kahveler|kahve|marka|akis|tadim|kafeler|kafe|istatistik)(\/|$)/;

const NAV_ITEMS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/bilgi", label: t.nav.info },
  { href: "/workshop", label: t.nav.workshop },
];

/** Where members change things. */
const SIGNED_IN_AREA = /^\/(panel|hesap|bildirimler)(\/|$)/;

/**
 * Every change made in the signed-in area refreshes the public pages, and the router
 * answers a refresh by fetching the links on screen again. Here that would start a read
 * of the archive right after each save, and the next quick save would land in the middle
 * of it (see lib/data/refresh-archive.ts). So links wait to be clicked there.
 */
export const prefetchFrom = (pathname: string | null) =>
  pathname !== null && SIGNED_IN_AREA.test(pathname) ? false : undefined;

const isCurrent = (pathname: string | null, href: string) =>
  pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

/** The underline that grows on hover and stays, in the accent, under the current section. */
const navItem =
  "relative flex items-center gap-1 py-2 font-medium text-ink-2 no-underline transition-colors after:absolute after:inset-x-0 after:bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-line-strong after:transition-transform hover:text-ink hover:after:scale-x-100 data-[current]:text-ink data-[current]:after:scale-x-100 data-[current]:after:bg-accent";

/**
 * "Keşfet": a button that opens the archive's four pages (a disclosure, not an app menu:
 * plain links a keyboard reaches with Tab). It closes with Escape, a click elsewhere, focus
 * moving away, or the page changing.
 */
function ExploreMenu({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const panelId = useId();
  const root = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const prefetch = prefetchFrom(pathname);

  // A new page closes the panel (its link was followed).
  if (open && pathname !== openedAt) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li
      ref={root}
      className="xs:relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        data-current={pathname !== null && EXPLORE_AREA.test(pathname) ? "" : undefined}
        className={cn(navItem, "cursor-pointer")}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
      >
        {t.nav.explore}
        <ChevronDownIcon
          aria-hidden
          className={cn("size-4 stroke-2 transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-4 top-full z-40 mt-1 rounded-lg border border-line bg-surface p-2 shadow-raised motion-safe:animate-pop xs:inset-x-auto xs:left-0 xs:w-120"
      >
        <ul className="grid gap-1 xs:grid-cols-2">
          {EXPLORE_ITEMS.map(({ href, label, hint, icon: Icon }, index) => (
            <li key={href}>
              <Link
                href={href}
                prefetch={prefetch}
                aria-current={isCurrent(pathname, href) ? "page" : undefined}
                aria-describedby={`${panelId}-${index}`}
                className="group/item flex items-start gap-3 rounded-md p-3 text-ink no-underline transition-colors hover:bg-sunk aria-[current=page]:bg-sunk"
                onClick={() => setOpen(false)}
              >
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-ink"
                >
                  <Icon className="size-5 stroke-[1.5]" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{label}</span>
                  {/* Read as the link's description, so its name stays the page's name. */}
                  <span id={`${panelId}-${index}`} aria-hidden className="type-meta">
                    {hint}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function NavLinkList({ pathname, className }: { pathname: string | null; className?: string }) {
  const prefetch = prefetchFrom(pathname);
  return (
    <ul className={cn("flex gap-6", className)}>
      <ExploreMenu pathname={pathname} />
      {NAV_ITEMS.map(({ href, label }) => {
        const active = isCurrent(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              prefetch={prefetch}
              aria-current={active ? "page" : undefined}
              data-current={active ? "" : undefined}
              className={navItem}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CurrentNavLinks({ className }: { className?: string }) {
  return <NavLinkList pathname={usePathname()} className={className} />;
}

/**
 * The main menu: "Keşfet" (coffees, tasting notes, cafés, statistics), the guides and the
 * workshop, the current section underlined in the accent. Which one is current depends on
 * the URL, which a page shell prerendered for an unknown URL does not have yet; the
 * fallback shows the same items without a marker until it is known.
 */
export function NavLinks({ className }: { className?: string }) {
  return (
    <Suspense fallback={<NavLinkList pathname={null} className={className} />}>
      <CurrentNavLinks className={className} />
    </Suspense>
  );
}
