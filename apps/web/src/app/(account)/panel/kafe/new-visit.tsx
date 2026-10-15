import { siteConfig } from "@espressoir/core";
import { Suspense } from "react";
import { z } from "zod";

import { CafeVisitForm } from "@/components/panel/cafe-visit-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getCafeFormOptions } from "@/lib/data/cafe-form-options";
import { placeOf } from "@/lib/data/cafes";
import { t } from "@/lib/i18n";

import { createCafeVisit } from "./actions";

async function NewVisit({ cafe }: { cafe: Promise<string | null> }) {
  const { supabase } = await requireUser();
  const wanted = await cafe;
  const options = await getCafeFormOptions();
  // A café chosen beforehand is read from the database when the cached archive does not
  // have it yet (one added a moment ago), so the form never opens without it.
  const cafeId = wanted && z.uuid().safeParse(wanted).success ? wanted : "";
  if (cafeId && !options.cafes.some((option) => option.id === cafeId)) {
    const { data } = await supabase
      .from("cafe_overview")
      .select("cafe_id, cafe_name, city_code, district")
      .eq("cafe_id", cafeId)
      .maybeSingle();
    if (data?.cafe_id && data.cafe_name && data.city_code) {
      options.cafes.unshift({
        id: data.cafe_id,
        label: `${data.cafe_name} — ${placeOf({ cityCode: data.city_code, district: data.district })}`,
        cityCode: data.city_code,
      });
    }
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(
    new Date(),
  );

  return (
    <CafeVisitForm
      action={createCafeVisit}
      options={options}
      today={today}
      initial={{ cafeMode: "existing", cafeId, visibility: "public", visitedOn: today }}
    />
  );
}

/**
 * The new-visit page: empty (`/panel/kafe/yeni`), or with a café already chosen
 * (`/panel/kafe/yeni/<café id>`, from "Burada ne içtin?" on a café's page). The café is
 * part of the path, not a `?kafe=` query: the router may answer a navigation with a copy
 * of the same path it fetched ahead, and a query string would then be lost.
 */
export function NewVisitPage({ cafe }: { cafe: Promise<string | null> }) {
  return (
    <PageShell>
      <PageHeading title={t.cafes.panel.newTitle} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <NewVisit cafe={cafe} />
      </Suspense>
    </PageShell>
  );
}
