import type { Metadata } from "next";

import { t } from "@/lib/i18n";

import { NewTastingPage } from "../../new-tasting";

export const metadata: Metadata = {
  title: t.panel.newTitle,
  robots: { index: false, follow: false },
};

/** "Tadım ekle" on a coffee's page: the form with that coffee chosen. */
export default function NewTastingOfPage({ params }: PageProps<"/panel/tadim/yeni/[kahve]">) {
  return <NewTastingPage coffee={params.then(({ kahve }) => kahve)} />;
}
