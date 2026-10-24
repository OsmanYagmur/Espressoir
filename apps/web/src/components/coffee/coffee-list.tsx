import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { cardClass } from "@/components/ui/card";
import type { CoffeeCard } from "@/lib/coffee-cards";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { ScoreBadge } from "./score-badge";

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
    return <Chip>{t.coffee.wishlist}</Chip>;
  }
  return (
    <span className="type-meta">
      {coffee.lastTastedLabel ?? t.coffee.undated}
      {coffee.tastingCount > 1
        ? ` · ${format(t.coffee.tastingCount, { count: coffee.tastingCount })}`
        : null}
    </span>
  );
}

/**
 * Coffees as rows or as a grid of cards; each one is a single link to the coffee's page.
 * Rendered on the server for the static page and again in the browser when filters change,
 * so it must stay free of server-only code.
 */
export function CoffeeList({
  coffees,
  view = "list",
  showBrand = true,
  heading: Heading = "h3",
  label,
}: {
  coffees: readonly CoffeeCard[];
  view?: "list" | "cards";
  showBrand?: boolean;
  /** The level that fits the page outline: "h2" when the list hangs directly under the title. */
  heading?: "h2" | "h3";
  label: string;
}) {
  if (view === "cards") {
    return (
      <ul aria-label={label} className="grid stagger gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coffees.map((coffee) => (
          <li key={coffee.id}>
            <Link
              href={coffee.href}
              className={cn(
                cardClass,
                "flex h-full flex-col gap-3 text-ink no-underline transition-[border-color,translate] hover:-translate-y-0.5 hover:border-line-strong",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Heading className="mb-1 type-card-title [overflow-wrap:anywhere]">
                    {coffee.name}
                  </Heading>
                  {showBrand ? <p className="type-meta">{coffee.brandName}</p> : null}
                </div>
                <ScoreBadge score={coffee.avgScore} />
              </div>
              <p className="type-meta">{facts(coffee).join(" · ") || t.coffee.unknown}</p>
              <div className="mt-auto border-t border-line pt-3">
                <Status coffee={coffee} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label={label} className="border-t border-line">
      {coffees.map((coffee) => (
        <li key={coffee.id} className="border-b border-line">
          <Link
            href={coffee.href}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 text-ink no-underline transition-colors hover:bg-sunk md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] md:px-2"
          >
            <div className="min-w-0">
              <Heading className="font-display text-xl font-semibold [overflow-wrap:anywhere]">
                {coffee.name}
              </Heading>
              <p className="type-meta">
                {[showBrand ? coffee.brandName : null, ...facts(coffee)]
                  .filter(Boolean)
                  .join(" · ") || t.coffee.unknown}
              </p>
            </div>
            <div className="max-md:order-last max-md:col-span-2 md:text-right">
              <Status coffee={coffee} />
            </div>
            <ScoreBadge score={coffee.avgScore} size="sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
