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

// (`undefined` too: a column the database does not have yet reads as "not given".)
const text = (value: string | number | null | undefined) => (value == null ? "" : String(value));

async function EditTasting({ params, searchParams }: PageProps<"/panel/tadim/[id]">) {
  const { id } = await params;
  const { foto } = await searchParams;
  const { user, supabase } = await requireUser();

  // Row level security already hides other people's private tastings; the user filter
  // also keeps their public ones out of this form.
  const { data: tasting } = z.uuid().safeParse(id).success
    ? await supabase
        .from("tastings")
        .select(
          "*, coffee:coffees(name, brand:brands(name)), method:brew_methods(slug), tags:tasting_flavor_tags(tag:flavor_tags(slug))",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!tasting) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-ink-2">{t.panel.notFound}</p>
        <Link href="/panel" className="text-accent-ink underline underline-offset-3">
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
      {foto === "hata" ? (
        // The tasting was saved a moment ago, its picture was not.
        <p role="alert" className="mb-6 font-medium text-danger">
          {t.photo.savedWithoutPhoto}
        </p>
      ) : null}
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
          flavorTagSlugs: tasting.tags.map(({ tag }) => tag.slug).join(","),
          photoPath: text(tasting.photo_path),
          photoWidth: text(tasting.photo_width),
          photoHeight: text(tasting.photo_height),
          photoAlt: text(tasting.photo_alt),
        }}
      />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteTasting action={deleteTasting.bind(null, tasting.id)} />
      </div>
    </>
  );
}

export default function EditTastingPage(props: PageProps<"/panel/tadim/[id]">) {
  return (
    <PageShell width="read">
      <PageHeading title={t.panel.editTitle} size="title" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <EditTasting {...props} />
      </Suspense>
    </PageShell>
  );
}
