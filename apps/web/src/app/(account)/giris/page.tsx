import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Card } from "@/components/ui/card";
import { authConfig } from "@/lib/auth-config";
import { t } from "@/lib/i18n";

import { InviteRequestForm } from "./invite-request-form";
import { LoginForm } from "./login-form";
import { LoginNotice } from "./login-notice";

export const metadata: Metadata = {
  title: t.auth.title,
  description: t.auth.description,
  robots: { index: false, follow: false },
};

const link = "text-accent-ink underline underline-offset-3";

export default function LoginPage() {
  return (
    <PageShell width="read">
      <div className="mx-auto max-w-sm">
        <PageHeading
          size="title"
          title={t.auth.title}
          lead={authConfig.signupEnabled ? t.auth.signupOpen : t.auth.inviteOnly}
        />
        {/* Reads the URL, which the prerendered page does not know; the form does not wait. */}
        <Suspense fallback={null}>
          <LoginNotice />
        </Suspense>
        <Card>
          <LoginForm />
        </Card>
        {authConfig.signupEnabled ? null : (
          // Joining is by invitation: a visitor who came for the notebook can ask for one
          // here, and learns what is open to them meanwhile, instead of meeting a closed
          // door. The home page's "Davet iste" lands on this section.
          <section
            id="davet"
            aria-labelledby="davet-baslik"
            className="mt-8 flex scroll-mt-6 flex-col gap-4 border-t border-line pt-6"
          >
            <h2 id="davet-baslik" className="type-card-title">
              {t.auth.noInviteTitle}
            </h2>
            <p className="text-ink-2">{t.auth.noInvite}</p>
            <p className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/akis" prefetch={false} className={link}>
                {t.auth.noInviteFeed}
              </Link>
              <Link href="/kahveler" prefetch={false} className={link}>
                {t.nav.coffees}
              </Link>
              <Link href="/bilgi" className={link}>
                {t.auth.noInviteGuides}
              </Link>
            </p>
            <InviteRequestForm />
          </section>
        )}
      </div>
    </PageShell>
  );
}
