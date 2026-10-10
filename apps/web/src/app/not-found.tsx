import Link from "next/link";

import { RingMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <RingMark thin className="size-24 opacity-80" />
      <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-brand">
        {t.states.notFoundCode}
      </p>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">{t.states.notFoundTitle}</h1>
      <p className="mt-4 text-muted-foreground">{t.states.notFoundBody}</p>
      <Button asChild className="mt-8">
        <Link href="/">{t.states.backHome}</Link>
      </Button>
    </div>
  );
}
