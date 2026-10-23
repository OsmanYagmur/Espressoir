import Link from "next/link";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <PageShell width="read">
      <PageHeading title={t.states.notFoundTitle} lead={t.states.notFoundBody}>
        <Button asChild>
          <Link href="/">{t.states.backHome}</Link>
        </Button>
      </PageHeading>
    </PageShell>
  );
}
