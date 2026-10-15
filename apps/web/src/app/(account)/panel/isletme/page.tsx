import { VERIFICATION_STATUSES } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BusinessPageForm } from "@/components/business/business-page-form";
import { OfficialBadge } from "@/components/business/official-badge";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { cafeHref } from "@/lib/data/cafes";
import { formatLongDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { brandPath } from "@/lib/routes";

import { updateBusinessPage, withdrawApplication } from "./actions";

const b = t.business.panel;

export const metadata: Metadata = {
  title: b.title,
  description: b.description,
  robots: { index: false, follow: false },
};

const linkFocus =
  "underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/** An embedded row arrives as an object or a one-element list, depending on the relation. */
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const isStatus = (value: string): value is (typeof VERIFICATION_STATUSES)[number] =>
  (VERIFICATION_STATUSES as readonly string[]).includes(value);

async function MyBusinesses() {
  const { user, supabase } = await requireUser();
  const [officials, requests] = await Promise.all([
    supabase
      .from("official_accounts")
      .select(
        "id, brand:brands(id, slug, name, description, website), cafe:cafes(id, slug, name, city_code, district, map_url, description, website)",
      )
      .eq("profile_id", user.id),
    supabase
      .from("verification_requests")
      .select(
        "id, status, created_at, note, brand:brands(name, slug), cafe:cafes(name, slug, city_code)",
      )
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  // A database without official accounts yet: nothing to show, nothing broken.
  const mine = officials.error ? [] : officials.data;
  const applications = requests.error ? [] : requests.data;

  return (
    <>
      <SectionHeading index={1} title={b.mineTitle} aside={mine.length} />
      {mine.length === 0 ? (
        <p className="border-b border-border py-6 text-muted-foreground">{b.mineEmpty}</p>
      ) : (
        <ul aria-label={b.mineTitle}>
          {mine.map((row) => {
            const brand = one(row.brand);
            const cafe = one(row.cafe);
            const business = brand ?? cafe;
            if (!business) return null;
            const href = brand
              ? brandPath(brand.slug)
              : cafeHref({ cityCode: cafe!.city_code, slug: cafe!.slug });
            return (
              <li key={row.id} className="border-b border-border py-4">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="label-caps text-muted-foreground">
                    {brand ? b.kinds.brand : b.kinds.cafe}
                  </span>
                  <span className="font-semiwide text-lg font-bold [overflow-wrap:anywhere]">
                    {business.name}
                  </span>
                  <OfficialBadge />
                  {/* Not fetched ahead: saving here changes that very page. */}
                  <Link href={href} prefetch={false} className={`font-mono text-xs ${linkFocus}`}>
                    {b.viewPage}
                  </Link>
                </p>
                <BusinessPageForm
                  idPrefix={row.id}
                  cafe={cafe !== null}
                  action={updateBusinessPage.bind(null, brand ? "brand" : "cafe", business.id)}
                  initial={{
                    description: business.description ?? "",
                    website: business.website ?? "",
                    district: cafe?.district ?? "",
                    mapUrl: cafe?.map_url ?? "",
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
      {mine.length > 0 ? (
        <p className="max-w-[62ch] py-3 font-mono text-xs text-muted-foreground">{b.noScoreNote}</p>
      ) : null}

      <SectionHeading
        index={2}
        title={b.requestsTitle}
        aside={applications.length}
        className="mt-6"
      />
      {applications.length === 0 ? (
        <p className="border-b border-border py-6 text-muted-foreground">{b.requestsEmpty}</p>
      ) : (
        <ul aria-label={b.requestsTitle}>
          {applications.map((request) => {
            const business = one(request.brand) ?? one(request.cafe);
            const status = isStatus(request.status) ? request.status : "open";
            return (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
              >
                <p className="min-w-0 [overflow-wrap:anywhere]">
                  <span className="font-semibold">{business?.name}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatLongDay(request.created_at.slice(0, 10))} ·{" "}
                    <span className="text-foreground uppercase">{b.statuses[status]}</span>
                    {request.note ? ` · ${request.note}` : null}
                  </span>
                </p>
                {status === "open" ? (
                  <form action={withdrawApplication.bind(null, request.id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="h-9 font-mono text-xs uppercase"
                    >
                      {b.withdraw}
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function BusinessPage() {
  return (
    <PageShell>
      <PageHeading title={b.title} aside={<p>{b.description}</p>} lead={b.lead} />
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <MyBusinesses />
      </Suspense>
    </PageShell>
  );
}
