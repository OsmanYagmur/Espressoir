import Link from "next/link";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1240px] px-5">
      <div className="grid gap-6 border-b border-rule pt-9 pb-8 md:grid-cols-[auto_1fr] md:items-end">
        <p className="font-wide text-[clamp(5rem,18vw,12rem)] leading-[0.8] font-extrabold tracking-[-0.04em] text-brand">
          {t.states.notFoundCode}
        </p>
        <div className="md:pb-2">
          <h1 className="font-semiwide text-3xl font-bold tracking-tight">
            {t.states.notFoundTitle}
          </h1>
          <p className="mt-2 max-w-[52ch] text-muted-foreground">{t.states.notFoundBody}</p>
          <Button asChild className="mt-6 font-mono text-xs uppercase">
            <Link href="/">{t.states.backHome}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
