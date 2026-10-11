import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.legal.kvkk.title,
  description: t.legal.kvkk.description,
  alternates: { canonical: "/kvkk" },
};

export default function KvkkPage() {
  return <LegalPage page="kvkk" />;
}
