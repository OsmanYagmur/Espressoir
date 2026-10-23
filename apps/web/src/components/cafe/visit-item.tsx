import type { CafeVisit } from "@espressoir/db";
import Link from "next/link";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { ReportButton } from "@/components/social/report-button";
import { cardClass } from "@/components/ui/card";
import { cafeHref, placeOf } from "@/lib/data/cafes";
import { formatShortDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** "Flat white" or "Filtre kahve · Etiyopya V60". */
export function drinkLabel(visit: Pick<CafeVisit, "drink" | "drinkName">): string {
  return [t.cafes.drinks[visit.drink], visit.drinkName].filter(Boolean).join(" · ");
}

/**
 * One café visit as a card, like a tasting: the café (or, on its own page, the drink) and
 * the score, the note, then who and when. A visit has no page of its own, so the card is
 * not a link; it carries its own report button.
 */
export function VisitCard({
  visit,
  currentYear,
  showCafe = false,
  showAuthor = false,
}: {
  visit: CafeVisit;
  /** Dates in this year leave the year out ("23 Eki"). */
  currentYear: number;
  showCafe?: boolean;
  showAuthor?: boolean;
}) {
  return (
    <article className={cn(cardClass, "flex h-full flex-col gap-3")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {showCafe ? (
            <h3 className="mb-1 type-card-title [overflow-wrap:anywhere]">
              <Link href={cafeHref(visit.cafe)} className="text-ink no-underline hover:underline">
                {visit.cafe.name}
              </Link>
            </h3>
          ) : null}
          <p className={showCafe ? "type-meta" : "type-label"}>
            {showCafe ? `${placeOf(visit.cafe)} · ${drinkLabel(visit)}` : drinkLabel(visit)}
          </p>
        </div>
        <ScoreBadge score={visit.score} />
      </div>
      {visit.notes ? (
        // Plain text, escaped by React; line breaks the author typed are kept.
        <p className="line-clamp-3 [overflow-wrap:anywhere] whitespace-pre-line">{visit.notes}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3 type-meta">
        <span>
          {showAuthor ? (
            <>
              <Link
                href={profilePath(visit.author.username)}
                className="text-ink-2 no-underline hover:text-ink hover:underline"
              >
                @{visit.author.username}
              </Link>
              {" · "}
            </>
          ) : null}
          <time dateTime={visit.visitedOn}>{formatShortDay(visit.visitedOn, currentYear)}</time>
        </span>
        <ReportButton target="cafe_visit" targetId={visit.id} />
      </div>
    </article>
  );
}
