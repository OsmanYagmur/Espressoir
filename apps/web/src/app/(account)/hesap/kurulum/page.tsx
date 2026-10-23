import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth";
import { t } from "@/lib/i18n";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: t.onboarding.title,
  description: t.onboarding.description,
  robots: { index: false, follow: false },
};

// The first stop of a new account: nothing else in the signed-in area opens before this.
async function Onboarding() {
  const { user } = await requireSession();
  if (user.onboarded) redirect("/panel");
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <PageShell width="read">
      <PageHeading title={t.onboarding.title} size="title" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Onboarding />
      </Suspense>
    </PageShell>
  );
}
