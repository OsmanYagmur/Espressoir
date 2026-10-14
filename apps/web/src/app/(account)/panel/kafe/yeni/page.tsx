import { siteConfig } from "@espressoir/core";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { CafeVisitForm } from "@/components/panel/cafe-visit-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getCafeFormOptions } from "@/lib/data/cafe-form-options";
import { t } from "@/lib/i18n";

import { createCafeVisit } from "../actions";

export const metadata: Metadata = {
  title: t.cafes.panel.newTitle,
  robots: { index: false, follow: false },
};

async function NewVisit({ searchParams }: PageProps<"/panel/kafe/yeni">) {
  await requireUser();
  const { kafe } = await searchParams;
  const options = await getCafeFormOptions();
  // From a café's page ("Burada ne içtin?"): that café is already chosen.
  const cafeId = typeof kafe === "string" && z.uuid().safeParse(kafe).success ? kafe : "";
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

export default function NewCafeVisitPage(props: PageProps<"/panel/kafe/yeni">) {
  return (
    <PageShell>
      <PageHeading title={t.cafes.panel.newTitle} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <NewVisit {...props} />
      </Suspense>
    </PageShell>
  );
}
