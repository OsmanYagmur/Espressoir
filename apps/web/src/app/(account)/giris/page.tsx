import type { Metadata } from "next";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { t } from "@/lib/i18n";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: t.auth.title,
  description: t.auth.description,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PageShell>
      <PageHeading title={t.auth.title} aside={<p>{t.auth.closed}</p>} />
      <SectionHeading index={1} title={t.auth.submit} />
      <LoginForm />
    </PageShell>
  );
}
