import type { Metadata } from "next";

import { t } from "@/lib/i18n";

import { ApplyPage } from "../../../apply-page";

export const metadata: Metadata = {
  title: t.business.apply.title,
  robots: { index: false, follow: false },
};

export default function ApplyBrandPage({ params }: PageProps<"/panel/isletme/basvuru/marka/[id]">) {
  return <ApplyPage kind="brand" id={params.then(({ id }) => id)} />;
}
