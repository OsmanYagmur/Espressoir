import type { Metadata } from "next";

import { t } from "@/lib/i18n";

import { NewVisitPage } from "../new-visit";

export const metadata: Metadata = {
  title: t.cafes.panel.newTitle,
  robots: { index: false, follow: false },
};

export default function NewCafeVisitPage() {
  return <NewVisitPage cafe={Promise.resolve(null)} />;
}
