import type { Tasting } from "@espressoir/db";
import Link from "next/link";

import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { ScoreBadge } from "./score-badge";

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/** How a tasting was brewed: "Kapsül Makinesi · Nespresso C30". */
export function brewLabel(tasting: Pick<Tasting, "brewMethod" | "device">): string | null {
  if (tasting.brewMethod && tasting.device) {
    return format(t.coffee.methodWithDevice, {
      method: tasting.brewMethod.name,
      device: tasting.device,
    });
  }
  return tasting.brewMethod?.name ?? tasting.device;
}

/**
 * One tasting as a form entry: date and method on the label line, the note beneath, the
 * score boxed on the right. With `showCoffee` the coffee is the entry's title (feeds);
 * without it the entry sits on that coffee's own page.
 */
export function TastingItem({
  tasting,
  showCoffee = false,
  clampNotes = false,
}: {
  tasting: Tasting;
  showCoffee?: boolean;
  clampNotes?: boolean;
}) {
  const wishlist = tasting.status === "wishlist";
  const meta = [
    wishlist
      ? t.coffee.wishlist
      : tasting.tastedAt
        ? formatDay(tasting.tastedAt)
        : t.coffee.undated,
    brewLabel(tasting),
  ].filter((part): part is string => Boolean(part));

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_54px] gap-4 border-b border-border py-4">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">
          {tasting.tastedAt && !wishlist ? (
            <>
              <time dateTime={tasting.tastedAt}>{meta[0]}</time>
              {meta.length > 1 ? ` · ${meta.slice(1).join(" · ")}` : null}
            </>
          ) : (
            meta.join(" · ")
          )}
        </p>
        {showCoffee ? (
          <h3 className="font-semiwide mt-1 text-xl leading-tight font-bold [overflow-wrap:anywhere]">
            <Link href={coffeePath(tasting.brand.slug, tasting.coffee.slug)} className={linkFocus}>
              {tasting.coffee.name}
            </Link>{" "}
            <Link
              href={brandPath(tasting.brand.slug)}
              className={cn("font-mono text-xs font-normal text-muted-foreground", linkFocus)}
            >
              {tasting.brand.name}
            </Link>
          </h3>
        ) : null}
        {tasting.notes ? (
          // Plain text, escaped by React; line breaks the author typed are kept.
          <p
            className={cn(
              "mt-1.5 max-w-[62ch] text-[0.95rem] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line",
              clampNotes && "line-clamp-3",
            )}
          >
            {tasting.notes}
          </p>
        ) : showCoffee ? null : (
          <p className="mt-1.5 text-[0.95rem] text-muted-foreground">
            {wishlist ? t.coffeeDetail.wishlistNote : t.coffee.noNotes}
          </p>
        )}
      </div>
      <ScoreBadge score={tasting.score} />
    </li>
  );
}
