import type { CafeVisit } from "@espressoir/db";
import Link from "next/link";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { ReportButton } from "@/components/social/report-button";
import { cafeHref, placeOf } from "@/lib/data/cafes";
import { formatDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/** "Flat white" or "Filtre kahve · Etiyopya V60". */
export function drinkLabel(visit: Pick<CafeVisit, "drink" | "drinkName">): string {
  return [t.cafes.drinks[visit.drink], visit.drinkName].filter(Boolean).join(" · ");
}

/**
 * One visit as a form entry, like a tasting: who and when on the label line, the drink as
 * the title, the note beneath, the score boxed on the right. With `showCafe` the café and
 * its place come first (feeds, profiles); on the café's own page they are left out.
 */
export function VisitItem({
  visit,
  showCafe = false,
  showAuthor = false,
  clampNotes = false,
}: {
  visit: CafeVisit;
  showCafe?: boolean;
  showAuthor?: boolean;
  clampNotes?: boolean;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_54px] gap-4 border-b border-border py-4 sade:py-5">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">
          {showAuthor ? (
            <>
              <Link
                href={profilePath(visit.author.username)}
                className={cn("text-foreground", linkFocus)}
              >
                @{visit.author.username}
              </Link>
              {" · "}
            </>
          ) : null}
          <time dateTime={visit.visitedOn}>{formatDay(visit.visitedOn)}</time>
          {showCafe ? ` · ${placeOf(visit.cafe)}` : null}
        </p>
        <h3 className="font-semiwide mt-1 text-xl leading-tight font-bold [overflow-wrap:anywhere] sade:mt-1.5 sade:text-[1.4rem]">
          {showCafe ? (
            <>
              <Link href={cafeHref(visit.cafe)} className={linkFocus}>
                {visit.cafe.name}
              </Link>{" "}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {drinkLabel(visit)}
              </span>
            </>
          ) : (
            drinkLabel(visit)
          )}
        </h3>
        {visit.notes ? (
          // Plain text, escaped by React; line breaks the author typed are kept.
          <p
            className={cn(
              "mt-1.5 max-w-[62ch] text-[0.95rem] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line",
              clampNotes && "line-clamp-3",
            )}
          >
            {visit.notes}
          </p>
        ) : null}
        <ReportButton target="cafe_visit" targetId={visit.id} className="mt-1" />
      </div>
      <ScoreBadge score={visit.score} />
    </li>
  );
}
