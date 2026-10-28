import { siteConfig } from "@espressoir/core";
import { Suspense } from "react";
import { z } from "zod";

import { TastingForm } from "@/components/panel/tasting-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getTastingFormOptions } from "@/lib/data/tasting-form-options";
import { t } from "@/lib/i18n";

import { createTasting } from "../actions";

/** How many of the member's recent coffees are offered as one-tap choices. */
const RECENT = 6;

async function NewTasting({ coffee }: { coffee: Promise<string | null> }) {
  const { user, supabase } = await requireUser();
  const wanted = await coffee;
  const options = await getTastingFormOptions();
  // A coffee chosen beforehand is read from the database when the cached archive does not
  // have it yet (one added a moment ago), so the form never opens without it.
  const coffeeId = wanted && z.uuid().safeParse(wanted).success ? wanted : "";
  if (coffeeId && !options.coffees.some((option) => option.id === coffeeId)) {
    const { data } = await supabase
      .from("coffee_overview")
      .select("coffee_id, coffee_name, brand_name")
      .eq("coffee_id", coffeeId)
      .maybeSingle();
    if (data?.coffee_id && data.coffee_name && data.brand_name) {
      options.coffees.unshift({
        id: data.coffee_id,
        label: `${data.brand_name} — ${data.coffee_name}`,
      });
    }
  }
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
    if (!row.coffee_id || recent.some((item) => item.id === row.coffee_id)) continue;
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
        coffeeId,
        brewMethodSlug: last?.brew_method_slug ?? "",
        device: last?.device ?? "",
      }}
    />
  );
}

/**
 * The new-tasting page: empty (`/panel/tadim/yeni`), or with a coffee already chosen
 * (`/panel/tadim/yeni/<coffee id>`, from "Tadım ekle" on a coffee's page). The coffee is
 * part of the path, not a query, for the same reason as the café form's (new-visit.tsx).
 */
export function NewTastingPage({ coffee }: { coffee: Promise<string | null> }) {
  return (
    <PageShell width="read">
      <PageHeading title={t.panel.newTitle} size="title" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <NewTasting coffee={coffee} />
      </Suspense>
    </PageShell>
  );
}
