"use client";

import { useSearchParams } from "next/navigation";

import { t } from "@/lib/i18n";

/** Why the visitor was sent back here by a sign-in link or by Google (`?hata=`). */
const NOTICES: Record<string, string> = {
  baglanti: t.auth.notices.link,
  davet: t.auth.notices.invite,
  hata: t.auth.notices.failed,
};

export function LoginNotice() {
  const reason = useSearchParams().get("hata");
  const text = reason ? NOTICES[reason] : undefined;
  if (!text) return null;

  return (
    <p
      role="alert"
      className="mt-6 max-w-xl border-l-2 border-destructive pl-3 font-mono text-sm text-destructive"
    >
      {text}
    </p>
  );
}
