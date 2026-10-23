import { ExternalLinkIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";

import { OfficialBadge } from "./official-badge";

const b = t.business;
const link = "text-accent-ink underline underline-offset-3";

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
    <section className="mb-8 flex max-w-read flex-col gap-3">
      {description ? (
        // Plain text, escaped by React; the line breaks typed are kept.
        <p className="[overflow-wrap:anywhere] whitespace-pre-line">{description}</p>
      ) : null}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 type-meta">
        {officialUsername ? (
          <span className="flex flex-wrap items-center gap-2">
            <OfficialBadge />
            <Link href={profilePath(officialUsername)} className={link}>
              @{officialUsername}
            </Link>
          </span>
        ) : (
          <Link href={claimHref} prefetch={false} className={link}>
            {b.claim}
          </Link>
        )}
        {website ? (
          // A link the business itself gave: no referrer, no ranking credit.
          <a
            href={website}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className={`inline-flex items-center gap-1 ${link}`}
          >
            {b.website}
            <ExternalLinkIcon aria-hidden className="size-4 stroke-[1.5]" />
          </a>
        ) : null}
      </p>
    </section>
  );
}
