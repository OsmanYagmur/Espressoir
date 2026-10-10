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

async function NewTasting() {
  await requireUser();
  const options = await getTastingFormOptions();
  // Dated today by default, in the archive's own time zone.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(
    new Date(),
  );

  return (
    <TastingForm
      action={createTasting}
      options={options}
      today={today}
      initial={{ status: "logged", visibility: "public", tastedAt: today }}
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
