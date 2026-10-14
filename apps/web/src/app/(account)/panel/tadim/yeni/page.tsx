import { siteConfig } from "@espressoir/core";
import type { Metadata } from "next";
import { Suspense } from "react";

import { TastingForm } from "@/components/panel/tasting-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getTastingFormOptions } from "@/lib/data/tasting-form-options";
import { t } from "@/lib/i18n";

import { createTasting } from "../../actions";

export const metadata: Metadata = {
  title: t.panel.newTitle,
  robots: { index: false, follow: false },
};

/** How many of the member's recent coffees are offered as one-tap choices. */
const RECENT = 6;

async function NewTasting() {
  const { user, supabase } = await requireUser();
  const options = await getTastingFormOptions();
  // The member's own latest tastings, private ones included: the coffees they come back
  // to, and how they brewed last time (most people use one or two methods every day).
  const { data: mine } = await supabase
    .from("tasting_feed")
    .select("coffee_id, coffee_name, brand_name, brew_method_slug, device")
    .eq("user_id", user.id)
    .eq("status", "logged")
    .order("created_at", { ascending: false })
    .order("tasting_id", { ascending: false })
    .limit(40);
  const recent: { id: string; label: string }[] = [];
  for (const row of mine ?? []) {
    if (!row.coffee_id || recent.some((coffee) => coffee.id === row.coffee_id)) continue;
    recent.push({ id: row.coffee_id, label: `${row.brand_name} — ${row.coffee_name}` });
    if (recent.length === RECENT) break;
  }
  const last = mine?.[0];
  // Dated today by default, in the archive's own time zone.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(
    new Date(),
  );

  return (
    <TastingForm
      action={createTasting}
      options={{ ...options, recent }}
      today={today}
      initial={{
        status: "logged",
        visibility: "public",
        tastedAt: today,
        brewMethodSlug: last?.brew_method_slug ?? "",
        device: last?.device ?? "",
      }}
    />
  );
}

export default function NewTastingPage() {
  return (
    <PageShell>
      <PageHeading title={t.panel.newTitle} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <NewTasting />
      </Suspense>
    </PageShell>
  );
}
