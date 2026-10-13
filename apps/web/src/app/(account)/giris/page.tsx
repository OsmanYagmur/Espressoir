import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { authConfig } from "@/lib/auth-config";
import { t } from "@/lib/i18n";

import { LoginForm } from "./login-form";
import { LoginNotice } from "./login-notice";

export const metadata: Metadata = {
  title: t.auth.title,
  description: t.auth.description,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PageShell>
      <PageHeading
        title={t.auth.title}
        aside={<p>{authConfig.signupEnabled ? t.auth.signupOpen : t.auth.inviteOnly}</p>}
        lead={authConfig.signupEnabled ? t.auth.signupOpen : t.auth.inviteOnly}
      />
      {/* Reads the URL, which the prerendered page does not know; the form does not wait. */}
      <Suspense fallback={null}>
        <LoginNotice />
      </Suspense>
      <LoginForm />
    </PageShell>
  );
}
