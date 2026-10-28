import type { Metadata } from "next";

import { t } from "@/lib/i18n";

import { NewTastingPage } from "../new-tasting";

export const metadata: Metadata = {
  title: t.panel.newTitle,
  robots: { index: false, follow: false },
};

export default function NewTasting() {
  return <NewTastingPage coffee={Promise.resolve(null)} />;
}
