import type { Metadata } from "next";

import { t } from "@/lib/i18n";

import { NewVisitPage } from "../../new-visit";

export const metadata: Metadata = {
  title: t.cafes.panel.newTitle,
  robots: { index: false, follow: false },
};

/** "Burada ne içtin?" on a café's page: the form with that café chosen. */
export default function NewCafeVisitAtPage({ params }: PageProps<"/panel/kafe/yeni/[kafe]">) {
  return <NewVisitPage cafe={params.then(({ kafe }) => kafe)} />;
}
