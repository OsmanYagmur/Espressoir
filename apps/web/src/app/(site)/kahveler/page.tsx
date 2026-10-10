import type { Metadata } from "next";

import { ComingSoon } from "@/components/site/coming-soon";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.nav.coffees };

export default function CoffeesPage() {
  return <ComingSoon title={t.nav.coffees} />;
}
