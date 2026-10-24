"use client";

import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GA_MEASUREMENT_ID, setConsent, useConsent } from "@/lib/consent";
import { t } from "@/lib/i18n";

/**
 * The cookie question (DESIGN.md: one line at the bottom, no pop-up). Shown until the
 * visitor answers; "Reddet" and "Kabul et" weigh the same.
 */
export function ConsentBar() {
  const consent = useConsent();
  if (!GA_MEASUREMENT_ID || consent !== null) return null;
  return (
    <section
      aria-label={t.consent.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom))] shadow-sticky motion-safe:animate-rise"
    >
      <div className="mx-auto flex max-w-grid flex-wrap items-center gap-x-6 gap-y-3">
        <p className="min-w-0 flex-1 basis-80 text-sm">
          {t.consent.text}{" "}
          <Link
            href={"/gizlilik#cerezler" as Route}
            prefetch={false}
            className="text-accent-ink underline underline-offset-3"
          >
            {t.consent.more}
          </Link>
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConsent("denied")}>
            {t.consent.decline}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConsent("granted")}>
            {t.consent.accept}
          </Button>
        </div>
      </div>
    </section>
  );
}

/** "Çerez tercihleri" in the footer: forgets the answer, so the question comes back. */
export function ConsentReset({ className }: { className?: string }) {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <button type="button" className={className} onClick={() => setConsent(null)}>
      {t.footer.cookies}
    </button>
  );
}
