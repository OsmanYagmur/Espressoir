import { siteConfig } from "@espressoir/core";
import { notificationRowSchema, type Notification } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { format, t } from "@/lib/i18n";
import { profilePath, tastingPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { MarkRead } from "./mark-read";

const n = t.notifications;
const SHOWN = 100;

export const metadata: Metadata = {
  title: n.title,
  description: n.description,
  robots: { index: false, follow: false },
};

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

const when = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

function Item({ item }: { item: Notification }) {
  return (
    <li
      className={cn(
        "grid gap-1 border-b border-border py-3.5",
        // Unread: a rule in the accent down the side, and the word "Yeni" (not colour alone).
        !item.read && "border-l-2 border-l-brand pl-3",
      )}
    >
      <p className="[overflow-wrap:anywhere]">
        <Link
          href={profilePath(item.actor.username)}
          prefetch={false}
          className={`font-mono text-sm ${linkFocus}`}
        >
          @{item.actor.username}
        </Link>{" "}
        {n.kinds[item.type]}
        {item.tasting ? (
          <>
            {": "}
            <Link
              href={tastingPath(item.tasting.id)}
              prefetch={false}
              className={`font-semibold ${linkFocus}`}
            >
              {item.tasting.brandName} {item.tasting.coffeeName}
            </Link>
          </>
        ) : null}
        {item.read ? null : (
          <span className="ml-2 border border-foreground px-1.5 py-0.5 font-mono text-xs uppercase">
            {n.unread}
          </span>
        )}
      </p>
      {item.excerpt ? (
        // Plain text, escaped by React.
        <p className="max-w-[62ch] text-sm [overflow-wrap:anywhere] text-muted-foreground">
          “{item.excerpt}”
        </p>
      ) : null}
      <time dateTime={item.createdAt} className="font-mono text-xs text-muted-foreground">
        {when.format(new Date(item.createdAt))}
      </time>
    </li>
  );
}

// The member's own notifications, read on each request with their session.
async function Inbox() {
  const { supabase } = await requireUser();
  const shownAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(SHOWN);
  if (error) throw new Error(error.message);
  const items = z.array(notificationRowSchema).parse(data);
  const unread = items.filter((item) => !item.read).length;

  return (
    <>
      <nav className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border py-4 font-mono text-xs">
        <Link href="/panel" className={`uppercase ${linkFocus}`}>
          {n.back}
        </Link>
        {unread > 0 ? <p role="status">{format(n.summary, { count: unread })}</p> : null}
      </nav>
      {items.length === 0 ? (
        <p className="border-b border-border py-8 text-muted-foreground">{n.empty}</p>
      ) : (
        <ul aria-label={n.listLabel}>
          {items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
      )}
      {unread > 0 ? <MarkRead shownAt={shownAt} /> : null}
    </>
  );
}

export default function NotificationsPage() {
  return (
    <PageShell>
      <PageHeading title={n.title} lead={n.lead} />
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <Inbox />
      </Suspense>
    </PageShell>
  );
}
