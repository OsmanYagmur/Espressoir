import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = {
  title: t.auth.link.title,
  description: t.auth.link.description,
  robots: { index: false, follow: false },
  // The token is in the URL: do not hand it to other sites through the Referer header.
  referrer: "no-referrer",
};

type Props = PageProps<"/auth/confirm">;

async function Confirm({ searchParams }: Pick<Props, "searchParams">) {
  const { token_hash: tokenHash, type } = await searchParams;
  if (typeof tokenHash !== "string" || !tokenHash) {
    return (
      <div className="grid max-w-sm gap-4 py-6">
        <p role="alert" className="border-l-2 border-destructive pl-3 font-mono text-sm">
          {t.auth.link.invalid}
        </p>
        <Link
          href="/giris"
          className="font-mono text-xs underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t.auth.link.back}
        </Link>
      </div>
    );
  }
  return <ConfirmForm tokenHash={tokenHash} type={typeof type === "string" ? type : "email"} />;
}

/**
 * The landing page of a sign-in or invitation link. It signs in only after a click:
 * mail scanners and link previews fetch pages but do not press buttons.
 */
export default function ConfirmPage({ searchParams }: Props) {
  return (
    <PageShell>
      <PageHeading title={t.auth.link.title} />
      <SectionHeading index={1} title={t.auth.title} />
      <Suspense fallback={<Skeleton className="my-6 h-24 max-w-sm" />}>
        <Confirm searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
