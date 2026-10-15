import type { Route } from "next";
import Link from "next/link";

import { t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";

import { OfficialBadge } from "./official-badge";

const b = t.business;
const linkFocus =
  "underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * What a brand or café says about itself, on its page: the description and website its
 * official account wrote, who that account is, or, without one, how to apply.
 */
export function BusinessBlock({
  description,
  website,
  officialUsername,
  claimHref,
}: {
  description: string | null;
  website: string | null;
  officialUsername: string | null;
  /** Where a member applies to become the official account. */
  claimHref: Route;
}) {
  return (
    <section className="grid gap-2 border-b border-border py-4">
      {description ? (
        // Plain text, escaped by React; the line breaks typed are kept.
        <p className="max-w-[62ch] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
          {description}
        </p>
      ) : null}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
        {officialUsername ? (
          <span>
            <OfficialBadge className="mr-2" />
            <Link href={profilePath(officialUsername)} className={linkFocus}>
              @{officialUsername}
            </Link>
          </span>
        ) : (
          <Link href={claimHref} prefetch={false} className={`text-muted-foreground ${linkFocus}`}>
            {b.claim}
          </Link>
        )}
        {website ? (
          // A link the business itself gave: no referrer, no ranking credit.
          <a
            href={website}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className={linkFocus}
          >
            {b.website} ↗
          </a>
        ) : null}
      </p>
    </section>
  );
}
