import type { Tasting } from "@espressoir/db";
import type { Route } from "next";
import Link from "next/link";

import { cardClass } from "@/components/ui/card";
import { formatShortDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { tastingPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { FlavorTags } from "./flavor-tags";
import { ScoreBadge } from "./score-badge";
import { TastingPhoto } from "./tasting-photo";

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
 * TastingCard (DESIGN.md): the coffee's name, roaster and method, the score, up to five
 * flavour notes, at most three lines of the note, then who and when, likes and comments.
 * The whole card is one link to the tasting's page, with no other link inside. A row
 * with nothing in it (no note, no notes) is not drawn.
 *
 * On a coffee's own page (`showCoffee={false}`) the name would only repeat the title, so
 * the card starts with the method instead. `href` replaces the tasting's public page for
 * entries that have none (an author's own private tastings).
 */
export function TastingCard({
  tasting,
  currentYear,
  showCoffee = true,
  href,
}: {
  tasting: Tasting;
  /** Dates in this year leave the year out ("23 Eki"). */
  currentYear: number;
  showCoffee?: boolean;
  href?: Route;
}) {
  const brew = brewLabel(tasting);
  const meta = showCoffee ? [tasting.brand.name, brew] : [brew];
  const when = tasting.tastedAt ? formatShortDay(tasting.tastedAt, currentYear) : t.coffee.undated;

  return (
    <Link
      href={href ?? tastingPath(tasting.id)}
      prefetch={false}
      className={cn(
        cardClass,
        "flex h-full flex-col gap-3 text-ink no-underline transition-[border-color,translate] hover:-translate-y-0.5 hover:border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {showCoffee ? (
            <h3 className="mb-1 type-card-title [overflow-wrap:anywhere]">{tasting.coffee.name}</h3>
          ) : null}
          <p className={showCoffee ? "type-meta" : "type-label"}>
            {meta.filter(Boolean).join(" · ") || t.coffee.unknown}
          </p>
        </div>
        <ScoreBadge score={tasting.score} />
      </div>
      <FlavorTags tags={tasting.tags} />
      {tasting.notes ? (
        // Plain text, escaped by React; line breaks the author typed are kept.
        <p className="line-clamp-3 [overflow-wrap:anywhere] whitespace-pre-line">{tasting.notes}</p>
      ) : null}
      {tasting.photo ? <TastingPhoto tasting={tasting} small className="max-h-56 w-auto" /> : null}
      <div className="mt-auto flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-line pt-3 type-meta">
        <span>
          @{tasting.author.username} ·{" "}
          {tasting.tastedAt ? <time dateTime={tasting.tastedAt}>{when}</time> : when}
        </span>
        {tasting.visibility === "public" ? (
          <span>
            {format(t.social.counts, { likes: tasting.likeCount, comments: tasting.commentCount })}
          </span>
        ) : (
          <span>{t.panel.visibility[tasting.visibility]}</span>
        )}
      </div>
    </Link>
  );
}
