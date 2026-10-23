import { VERIFICATION_STATUSES } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BusinessPageForm } from "@/components/business/business-page-form";
import { OfficialBadge } from "@/components/business/official-badge";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { cafeHref } from "@/lib/data/cafes";
import { formatLongDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { brandPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { updateBusinessPage, withdrawApplication } from "./actions";

const b = t.business.panel;

export const metadata: Metadata = {
  title: b.title,
  description: b.description,
  robots: { index: false, follow: false },
};

const link = "text-accent-ink underline underline-offset-3";

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
      <Section id="hesaplarim" className="mt-0 md:mt-0">
        <SectionHeading
          id="hesaplarim"
          title={b.mineTitle}
          aside={<span className="type-figure">{mine.length}</span>}
        />
        {mine.length === 0 ? (
          <p className="text-ink-2">{b.mineEmpty}</p>
        ) : (
          <ul aria-labelledby="hesaplarim" className="flex flex-col gap-4">
            {mine.map((row) => {
              const brand = one(row.brand);
              const cafe = one(row.cafe);
              const business = brand ?? cafe;
              if (!business) return null;
              const href = brand
                ? brandPath(brand.slug)
                : cafeHref({ cityCode: cafe!.city_code, slug: cafe!.slug });
              return (
                <li key={row.id} className={cn(cardClass, "flex flex-col gap-4")}>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="type-label">{brand ? b.kinds.brand : b.kinds.cafe}</span>
                    <span className="font-display text-lg font-semibold [overflow-wrap:anywhere]">
                      {business.name}
                    </span>
                    <OfficialBadge />
                    {/* Not fetched ahead: saving here changes that very page. */}
                    <Link href={href} prefetch={false} className={link}>
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
        {mine.length > 0 ? <p className="mt-4 type-meta">{b.noScoreNote}</p> : null}
      </Section>

      <Section id="basvurularim">
        <SectionHeading
          id="basvurularim"
          title={b.requestsTitle}
          aside={<span className="type-figure">{applications.length}</span>}
        />
        {applications.length === 0 ? (
          <p className="text-ink-2">{b.requestsEmpty}</p>
        ) : (
          <ul aria-labelledby="basvurularim" className="border-t border-line">
            {applications.map((request) => {
              const business = one(request.brand) ?? one(request.cafe);
              const status = isStatus(request.status) ? request.status : "open";
              return (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
                >
                  <p className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="font-semibold">{business?.name}</span>{" "}
                    <span className="type-meta">
                      {formatLongDay(request.created_at.slice(0, 10))} ·{" "}
                      <span className="text-ink">{b.statuses[status]}</span>
                      {request.note ? ` · ${request.note}` : null}
                    </span>
                  </p>
                  {status === "open" ? (
                    <form action={withdrawApplication.bind(null, request.id)}>
                      <Button type="submit" variant="secondary">
                        {b.withdraw}
                      </Button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}

export default function BusinessPage() {
  return (
    <PageShell width="read">
      <PageHeading title={b.title} lead={b.lead} size="title" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <MyBusinesses />
      </Suspense>
    </PageShell>
  );
}
