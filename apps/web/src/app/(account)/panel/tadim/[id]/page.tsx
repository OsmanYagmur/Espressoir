import { siteConfig, TASTE_DIMENSIONS } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { DeleteTasting } from "@/components/panel/delete-tasting";
import { TastingForm } from "@/components/panel/tasting-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getTastingFormOptions } from "@/lib/data/tasting-form-options";
import { t } from "@/lib/i18n";

import { deleteTasting, updateTasting } from "../../actions";

export const metadata: Metadata = {
  title: t.panel.editTitle,
  robots: { index: false, follow: false },
};

const text = (value: string | number | null) => (value === null ? "" : String(value));

async function EditTasting({ params }: Pick<PageProps<"/panel/tadim/[id]">, "params">) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  // Row level security already hides other people's private tastings; the user filter
  // also keeps their public ones out of this form.
  const { data: tasting } = z.uuid().safeParse(id).success
    ? await supabase
        .from("tastings")
        .select("*, coffee:coffees(name, brand:brands(name)), method:brew_methods(slug)")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!tasting) {
    return (
      <div className="border-b border-border py-8">
        <p className="text-muted-foreground">{t.panel.notFound}</p>
        <Link href="/panel" className="mt-3 inline-block font-mono text-xs uppercase underline">
          {t.panel.back}
        </Link>
      </div>
    );
  }

  const options = await getTastingFormOptions();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(
    new Date(),
  );

  return (
    <>
      <TastingForm
        action={updateTasting.bind(null, tasting.id)}
        options={options}
        today={today}
        editing={{ coffeeLabel: `${tasting.coffee.brand.name} — ${tasting.coffee.name}` }}
        initial={{
          coffeeMode: "existing",
          coffeeId: tasting.coffee_id,
          status: tasting.status,
          visibility: tasting.visibility,
          score: text(tasting.score),
          tastedAt: text(tasting.tasted_at),
          brewMethodSlug: text(tasting.method?.slug ?? null),
          device: text(tasting.device),
          notes: text(tasting.notes),
          ...Object.fromEntries(
            TASTE_DIMENSIONS.map((dimension) => [dimension, text(tasting[dimension])]),
          ),
          wouldBuyAgain:
            tasting.would_buy_again === null ? "" : tasting.would_buy_again ? "yes" : "no",
          pricePaid: text(tasting.price_paid),
        }}
      />
      <div className="max-w-2xl border-t border-rule pt-5 pb-10">
        <DeleteTasting action={deleteTasting.bind(null, tasting.id)} />
      </div>
    </>
  );
}

export default function EditTastingPage({ params }: PageProps<"/panel/tadim/[id]">) {
  return (
    <PageShell>
      <PageHeading title={t.panel.editTitle} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <EditTasting params={params} />
      </Suspense>
    </PageShell>
  );
}
