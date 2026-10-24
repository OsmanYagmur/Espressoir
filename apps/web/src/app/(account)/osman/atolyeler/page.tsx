import type { Metadata } from "next";

import type { Session } from "@/lib/auth";
import { t } from "@/lib/i18n";

import { ActionResult } from "../action-result";
import { AdminArea } from "../admin-area";
import { readWorkshopAdmin } from "./data";
import { WorkshopsAdmin } from "./workshops";

export const metadata: Metadata = {
  title: t.admin.workshops.title,
  robots: { index: false, follow: false },
};

type Props = PageProps<"/osman/atolyeler">;

async function Workshops({
  session: { supabase },
  searchParams,
}: { session: Session } & Pick<Props, "searchParams">) {
  const { workshops, applications } = await readWorkshopAdmin(supabase);
  return (
    <>
      <ActionResult searchParams={await searchParams} />
      <p className="mb-6 max-w-read text-ink-2">{t.admin.workshops.hint}</p>
      <WorkshopsAdmin workshops={workshops} applications={applications} />
    </>
  );
}

export default function WorkshopsPage({ searchParams }: Props) {
  return (
    <AdminArea tab="workshops">
      {(session) => <Workshops session={session} searchParams={searchParams} />}
    </AdminArea>
  );
}
