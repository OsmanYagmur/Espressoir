import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.legal.terms.title,
  description: t.legal.terms.description,
  alternates: { canonical: "/kosullar" },
};

export default function TermsPage() {
  return <LegalPage page="terms" />;
}
