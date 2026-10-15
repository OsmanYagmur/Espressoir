import { cityByCode } from "@espressoir/core";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { VerificationForm } from "@/components/business/verification-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { cafeHref } from "@/lib/data/cafes";
import { t } from "@/lib/i18n";
import { brandPath } from "@/lib/routes";

import { applyForBusiness, type BusinessKind } from "./actions";

const a = t.business.apply;
const linkFocus =
  "underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

async function Apply({ kind, id }: { kind: BusinessKind; id: Promise<string> }) {
  const { supabase } = await requireUser();
  const businessId = await id;
  const valid = z.uuid().safeParse(businessId).success;

  // Read from the database, not the cached archive: a café added a moment ago is here too.
  let business: { name: string; href: ReturnType<typeof brandPath> } | null = null;
  if (valid && kind === "brand") {
    const { data } = await supabase
      .from("brands")
      .select("name, slug")
      .eq("id", businessId)
      .maybeSingle();
    if (data) business = { name: data.name, href: brandPath(data.slug) };
  } else if (valid) {
    const { data } = await supabase
      .from("cafes")
      .select("name, slug, city_code, district")
      .eq("id", businessId)
      .maybeSingle();
    if (data) {
      const city = cityByCode(data.city_code)?.name;
      business = {
        name: [data.name, [data.district, city].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join(" — "),
        href: cafeHref({ cityCode: data.city_code, slug: data.slug }),
      };
    }
  }
  if (!business) {
    return <p className="border-b border-border py-8 text-muted-foreground">{a.notFound}</p>;
  }

  const { data: official } = await supabase
    .from("official_accounts")
    .select("id")
    .eq(kind === "brand" ? "brand_id" : "cafe_id", businessId)
    .maybeSingle();

  return (
    <>
      <p className="border-b border-border py-4">
        <span className="label-caps mr-2 text-muted-foreground">{a.business}</span>
        <Link
          href={business.href}
          prefetch={false}
          className={`font-semiwide font-bold ${linkFocus}`}
        >
          {business.name}
        </Link>
      </p>
      {official ? (
        <p className="border-b border-border py-6 text-muted-foreground">{a.alreadyOfficial}</p>
      ) : (
        <>
          <p className="max-w-[62ch] pt-4 text-sm text-muted-foreground">{t.business.claimNote}</p>
          <VerificationForm action={applyForBusiness.bind(null, kind, businessId)} />
        </>
      )}
    </>
  );
}

/**
 * The application page, for a brand or a café. Which one is in the path
 * (`/panel/isletme/basvuru/marka/<id>`), never in a query string (see CLAUDE.md).
 */
export function ApplyPage({ kind, id }: { kind: BusinessKind; id: Promise<string> }) {
  return (
    <PageShell>
      <PageHeading title={a.title} lead={a.lead} />
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <Apply kind={kind} id={id} />
      </Suspense>
    </PageShell>
  );
}
