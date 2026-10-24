import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/auth";
import { format, t } from "@/lib/i18n";
import { mailSetup } from "@/lib/workshop-mail";

import { ActionResult } from "../action-result";
import { AdminArea } from "../admin-area";
import { testApplicationMail } from "./actions";
import { readWorkshopAdmin } from "./data";
import { WorkshopsAdmin } from "./workshops";

export const metadata: Metadata = {
  title: t.admin.workshops.title,
  robots: { index: false, follow: false },
};

type Props = PageProps<"/osman/atolyeler">;

const m = t.admin.workshops.mail;

/**
 * Whether new applications reach the owner by e-mail, and a button that sends a test: the
 * way to check the Vercel variables after setting them (docs/deploy-vercel.md).
 */
function MailStatus() {
  const setup = mailSetup();
  if (!setup) return <p className="mb-6 max-w-read rounded-md bg-sunk p-4">{m.off}</p>;
  return (
    <form
      action={testApplicationMail}
      className="mb-6 flex max-w-read flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-sunk p-4"
    >
      <p className="[overflow-wrap:anywhere]">{format(m.on, { to: setup.to })}</p>
      <Button type="submit" variant="secondary" size="sm">
        {m.test}
      </Button>
    </form>
  );
}

async function Workshops({
  session: { supabase },
  searchParams,
}: { session: Session } & Pick<Props, "searchParams">) {
  const { workshops, applications } = await readWorkshopAdmin(supabase);
  return (
    <>
      <ActionResult searchParams={await searchParams} />
      <p className="mb-6 max-w-read text-ink-2">{t.admin.workshops.hint}</p>
      <MailStatus />
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
