import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { WorkshopDetail } from "@/components/workshop/workshop-detail";
import { getOpenWorkshops } from "@/lib/data/workshops";
import { t } from "@/lib/i18n";
import { workshopWhen } from "@/lib/workshop-format";

type Props = PageProps<"/workshop/[id]">;

// Every open workshop has its own page; the placeholder keeps a build without any open
// workshop going (it renders the 404 page).
export async function generateStaticParams() {
  const workshops = await getOpenWorkshops();
  if (workshops.length === 0) return [{ id: "-" }];
  return workshops.map((workshop) => ({ id: workshop.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const workshop = (await getOpenWorkshops()).find((candidate) => candidate.id === id);
  if (!workshop) return {};
  return {
    title: workshop.title,
    description: `${workshopWhen(workshop).full}. ${t.workshop.description}`,
    alternates: { canonical: `/workshop/${workshop.id}` },
  };
}

export default function WorkshopByIdPage({ params }: Props) {
  return (
    <PageShell width="read">
      <Suspense fallback={<PageSkeleton />}>
        <Detail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Detail({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const workshops = await getOpenWorkshops();
  const workshop = workshops.find((candidate) => candidate.id === id);
  if (!workshop) notFound();
  return (
    <WorkshopDetail
      workshop={workshop}
      others={workshops.filter((other) => other.id !== workshop.id)}
    />
  );
}
