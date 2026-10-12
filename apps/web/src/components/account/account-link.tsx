"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";

function Anchor({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      href={signedIn ? "/panel" : "/giris"}
      prefetch={false}
      className="py-1 font-mono text-xs font-medium tracking-wide uppercase underline-offset-[6px] hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sade:border sade:border-foreground sade:px-3 sade:py-1.5 sade:hover:bg-foreground sade:hover:text-background sade:hover:no-underline"
    >
      {signedIn ? t.nav.panel : t.nav.signIn}
    </Link>
  );
}

function CurrentAccountLink() {
  // The header outlives page changes; reading the path re-renders it after each one, so
  // the cookie is looked at again right after signing in or out.
  usePathname();
  const signedIn = useHasSession();
  return <Anchor signedIn={signedIn} />;
}

/**
 * The way into the signed-in area, in the header of every page. Public pages are static
 * and identical for everyone, so this one link decides in the browser what it says, and
 * it does so without loading the Supabase client: the answer is only a hint (the panel
 * itself checks the session properly).
 */
export function AccountLink() {
  return (
    <Suspense fallback={<Anchor signedIn={false} />}>
      <CurrentAccountLink />
    </Suspense>
  );
}
