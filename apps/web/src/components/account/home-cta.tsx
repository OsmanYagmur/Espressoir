"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";

/**
 * The third button of the home page's opening: "add a tasting" for someone signed in,
 * "sign in" for everyone else. The page is static, so the browser decides.
 */
export function HomeCta({ className }: { className?: string }) {
  const signedIn = useHasSession();
  return (
    <Button asChild variant="outline" className={className}>
      <Link href={signedIn ? "/panel/tadim/yeni" : "/giris"} prefetch={false}>
        {signedIn ? t.home.cta.addTasting : t.home.cta.signIn}
      </Link>
    </Button>
  );
}
