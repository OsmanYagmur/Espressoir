"use client";

import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";

const arrow = "transition-transform group-hover/cta:translate-x-1";

/**
 * The hero's two actions. A visitor's main action leads to the sign-in page, which says
 * that joining is by invitation; the line under the buttons says it too and offers the
 * public notes meanwhile, so nobody meets a dead end. A member (the browser holds a
 * session; the static page renders the visitor's version first) goes straight to the form.
 */
export function HeroActions() {
  const signedIn = useHasSession();
  const main: Route = signedIn ? "/panel/tadim/yeni" : "/giris";
  return (
    <div className="mt-2 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="group/cta">
          <Link href={main} prefetch={false}>
            {signedIn ? t.home.cta.add : t.home.cta.first}
            <ArrowRightIcon aria-hidden className={arrow} />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/kahveler" prefetch={false}>
            {t.home.cta.explore}
          </Link>
        </Button>
      </div>
      {signedIn ? null : (
        <p className="max-w-read type-meta">
          {t.home.inviteNote}{" "}
          <Link
            href="/akis"
            prefetch={false}
            className="text-accent-ink underline underline-offset-3"
          >
            {t.home.inviteLink}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
