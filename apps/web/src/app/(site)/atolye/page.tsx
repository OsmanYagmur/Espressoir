import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { WorkshopDetail } from "@/components/workshop/workshop-detail";
import { getOpenWorkshops } from "@/lib/data/workshops";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.workshop.title,
  description: t.workshop.description,
  alternates: { canonical: "/atolye" },
};

/** The next workshop that takes applications; the others are listed under it. */
export default async function WorkshopPage() {
  const [next, ...others] = await getOpenWorkshops();

  if (!next) {
    return (
      <PageShell width="read">
        <PageHeading title={t.workshop.emptyTitle} lead={t.workshop.emptyLead}>
          <Button asChild variant="secondary">
            <Link href="/bilgi">{t.workshop.emptyLink}</Link>
          </Button>
        </PageHeading>
      </PageShell>
    );
  }

  return (
    <PageShell width="read">
      <WorkshopDetail workshop={next} others={others} />
    </PageShell>
  );
}
