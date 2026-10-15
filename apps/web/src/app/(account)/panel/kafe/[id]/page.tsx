import { cityByCode, siteConfig } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { CafeVisitForm } from "@/components/panel/cafe-visit-form";
import { DeleteTasting } from "@/components/panel/delete-tasting";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getCafeFormOptions } from "@/lib/data/cafe-form-options";
import { t } from "@/lib/i18n";

import { deleteCafeVisit, updateCafeVisit } from "../actions";

export const metadata: Metadata = {
  title: t.cafes.panel.editTitle,
  robots: { index: false, follow: false },
};

const text = (value: string | number | null | undefined) => (value == null ? "" : String(value));

async function EditVisit({ params }: PageProps<"/panel/kafe/[id]">) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  // Row level security already hides other people's private visits; the user filter also
  // keeps their public ones out of this form.
  const { data: visit } = z.uuid().safeParse(id).success
    ? await supabase
        .from("cafe_visits")
        .select("*, cafe:cafes(name, city_code, district)")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!visit) {
    return (
      <div className="border-b border-border py-8">
        <p className="text-muted-foreground">{t.cafes.panel.notFound}</p>
        <Link href="/panel" className="mt-3 inline-block font-mono text-xs uppercase underline">
          {t.panel.back}
        </Link>
      </div>
    );
  }

  const options = await getCafeFormOptions();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(
    new Date(),
  );
  const place = [visit.cafe.district, cityByCode(visit.cafe.city_code)?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <CafeVisitForm
        action={updateCafeVisit.bind(null, visit.id)}
        options={options}
        today={today}
        editing={{ cafeLabel: `${visit.cafe.name} — ${place}` }}
        initial={{
          cafeMode: "existing",
          cafeId: visit.cafe_id,
          drink: visit.drink,
          drinkName: text(visit.drink_name),
          score: text(visit.score),
          visitedOn: visit.visited_on,
          notes: text(visit.notes),
          pricePaid: text(visit.price_paid),
          visibility: visit.visibility,
        }}
      />
      <div className="max-w-2xl border-t border-rule pt-5 pb-10">
        <DeleteTasting
          action={deleteCafeVisit.bind(null, visit.id)}
          label={t.cafes.panel.delete}
          confirmText={t.cafes.panel.deleteConfirm}
        />
      </div>
    </>
  );
}

export default function EditCafeVisitPage(props: PageProps<"/panel/kafe/[id]">) {
  return (
    <PageShell>
      <PageHeading title={t.cafes.panel.editTitle} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <EditVisit {...props} />
      </Suspense>
    </PageShell>
  );
}
