import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.legal.privacy.title,
  description: t.legal.privacy.description,
  alternates: { canonical: "/gizlilik" },
};

export default function PrivacyPage() {
  return <LegalPage page="privacy" />;
}
