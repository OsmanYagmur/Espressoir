import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, type Session } from "@/lib/auth";
import { t } from "@/lib/i18n";

import { LoginForm } from "../giris/login-form";

const a = t.admin;

export type AdminTab = keyof typeof a.area.tabs;

const TABS: ReadonlyArray<{ tab: AdminTab; href: Route }> = [
  { tab: "overview", href: "/osman" },
  { tab: "workshops", href: "/osman/atolyeler" },
  { tab: "moderation", href: "/osman/yonetim" },
];

function Tabs({ current }: { current: AdminTab }) {
  return (
    <nav aria-label={a.area.tabsLabel} className="border-b border-line">
      <ul className="flex flex-wrap gap-x-6">
        {TABS.map(({ tab, href }) => (
          <li key={tab}>
            {/* Not fetched ahead: every tab is read fresh from the database. */}
            <Link
              href={href}
              prefetch={false}
              aria-current={tab === current ? "page" : undefined}
              className="-mb-px block border-b-2 border-transparent py-2 font-medium text-ink-2 no-underline transition-colors hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
            >
              {a.area.tabs[tab]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function Gate({
  tab,
  children,
}: {
  tab: AdminTab;
  children: (session: Session) => React.ReactNode;
}) {
  const session = await getCurrentUser();

  if (session?.user.role === "admin") {
    return (
      <>
        <PageHeading title={a.title} lead={a.area.lead} size="title" />
        <Tabs current={tab} />
        <div className="pt-8">{children(session)}</div>
      </>
    );
  }

  return (
    <div className="max-w-read">
      <PageHeading
        title={a.title}
        lead={session ? a.area.notAdmin : a.area.signInLead}
        size="title"
      />
      {session ? (
        <Link href="/panel" className="text-accent-ink underline underline-offset-3">
          {a.back}
        </Link>
      ) : (
        <Card>
          <LoginForm variant="admin" />
        </Card>
      )}
    </div>
  );
}

/**
 * Every page of /osman: the signed-in admin sees the tabs and the page; anyone else is
 * asked for the e-mail and password of an admin account, right here. The address is no
 * secret and the door is no lock: the database lets only admins read and change what
 * these pages show.
 */
export function AdminArea({
  tab,
  children,
}: {
  tab: AdminTab;
  children: (session: Session) => React.ReactNode;
}) {
  return (
    <PageShell>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Gate tab={tab}>{children}</Gate>
      </Suspense>
    </PageShell>
  );
}
