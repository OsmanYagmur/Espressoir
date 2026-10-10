import Link from "next/link";

import type { CoffeeCard } from "@/lib/coffee-cards";
import { format, t } from "@/lib/i18n";
import { brandPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { ScoreBadge } from "./score-badge";

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

function facts(coffee: CoffeeCard): string[] {
  return [
    coffee.form ? t.coffee.forms[coffee.form] : null,
    coffee.brandIntensity !== null
      ? `${t.coffee.fields.intensity.toLocaleLowerCase("tr")} ${coffee.brandIntensity}`
      : null,
    coffee.originLabel,
    ...coffee.methodLabels,
  ].filter((fact): fact is string => fact !== null);
}

function Status({ coffee }: { coffee: CoffeeCard }) {
  if (coffee.wishlisted || coffee.tastingCount === 0) {
    return (
      <span className="label-caps border border-dashed border-input px-1.5 py-0.5">
        {t.coffee.wishlist}
      </span>
    );
  }
  return (
    <>
      {coffee.lastTastedLabel ?? t.coffee.undated}
      {coffee.tastingCount > 1
        ? ` · ${format(t.coffee.tastingCount, { count: coffee.tastingCount })}`
        : null}
    </>
  );
}

/**
 * Coffees as ruled rows or as a grid of cards. Rendered on the server for the static page
 * and again in the browser when filters change, so it must stay free of server-only code.
 */
export function CoffeeList({
  coffees,
  view = "list",
  showBrand = true,
  label,
}: {
  coffees: readonly CoffeeCard[];
  view?: "list" | "cards";
  showBrand?: boolean;
  label: string;
}) {
  if (view === "cards") {
    return (
      <ul
        aria-label={label}
        className="grid gap-px border-b border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3"
      >
        {coffees.map((coffee) => (
          <li
            key={coffee.id}
            className="flex flex-col gap-3 bg-background py-4 sm:px-4 sm:[&:nth-child(2n+1)]:pl-0 lg:[&:nth-child(2n+1)]:pl-4 lg:[&:nth-child(3n+1)]:pl-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showBrand ? (
                  <Link
                    href={brandPath(coffee.brandSlug)}
                    className={cn("font-mono text-xs text-muted-foreground", linkFocus)}
                  >
                    {coffee.brandName}
                  </Link>
                ) : null}
                <h3 className="font-semiwide text-xl leading-tight font-bold [overflow-wrap:anywhere]">
                  <Link href={coffee.href} className={linkFocus}>
                    {coffee.name}
                  </Link>
                </h3>
              </div>
              <ScoreBadge score={coffee.avgScore} />
            </div>
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              {facts(coffee).join(" · ") || t.coffee.unknown}
            </p>
            <p className="mt-auto font-mono text-xs text-muted-foreground">
              <Status coffee={coffee} />
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label={label}>
      {coffees.map((coffee) => (
        <li
          key={coffee.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
        >
          <div className="min-w-0">
            {showBrand ? (
              <Link
                href={brandPath(coffee.brandSlug)}
                className={cn("font-mono text-xs text-muted-foreground", linkFocus)}
              >
                {coffee.brandName}
              </Link>
            ) : null}
            <h3 className="font-semiwide text-lg leading-snug font-bold [overflow-wrap:anywhere]">
              <Link href={coffee.href} className={linkFocus}>
                {coffee.name}
              </Link>
            </h3>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {facts(coffee).join(" · ") || t.coffee.unknown}
            </p>
          </div>
          <p className="font-mono text-xs text-muted-foreground max-md:order-last max-md:col-span-2 md:text-right">
            <Status coffee={coffee} />
          </p>
          <ScoreBadge score={coffee.avgScore} />
        </li>
      ))}
    </ul>
  );
}
