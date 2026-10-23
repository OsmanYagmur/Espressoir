"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";
import { useHasSession } from "@/lib/session-cookie";

import type { AccountSummary } from "./account-data";

/** Sent by the notifications page once it has marked what it shows as read. */
export const NOTIFICATIONS_READ_EVENT = "espressoir:notifications-read";

function SignInLink() {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href="/giris" prefetch={false}>
        {t.nav.signIn}
      </Link>
    </Button>
  );
}

/** A 32px circle: the member's picture, or the first letter of their name. */
function Avatar({ account }: { account: AccountSummary | null }) {
  return (
    <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-sunk font-display text-sm font-semibold text-ink">
      {account?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- already the right size
        <img
          src={account.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 object-cover"
        />
      ) : account?.onboarded ? (
        account.username.slice(0, 1).toLocaleUpperCase("tr")
      ) : null}
    </span>
  );
}

function MenuLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <DropdownMenuItem asChild>
      {/* Not fetched ahead: several of these pages are built from the archive, and a fetch
          that starts while a member is saving keeps the old state. */}
      <Link href={href} prefetch={false}>
        {children}
      </Link>
    </DropdownMenuItem>
  );
}

function MemberMenu({ account }: { account: AccountSummary | null }) {
  const unread = account?.unread ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative cursor-pointer rounded-full"
        aria-label={
          unread > 0 ? format(t.nav.accountMenuUnread, { count: unread }) : t.nav.accountMenu
        }
        data-testid="account-menu"
      >
        <Avatar account={account} />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-bg bg-accent"
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {account?.onboarded ? (
          <MenuLink href={profilePath(account.username)}>{t.nav.profile}</MenuLink>
        ) : (
          <MenuLink href="/hesap/kurulum">{t.nav.finishSetup}</MenuLink>
        )}
        <MenuLink href="/panel">{t.nav.panel}</MenuLink>
        <MenuLink href="/bildirimler">
          {t.nav.notifications}
          {unread > 0 ? (
            <span className="type-figure text-accent-ink">{unread > 99 ? "99+" : unread}</span>
          ) : null}
        </MenuLink>
        <DropdownMenuSeparator />
        <MenuLink href="/kahveler">{t.nav.coffees}</MenuLink>
        <MenuLink href="/kafeler">{t.nav.cafes}</MenuLink>
        <MenuLink href="/istatistik">{t.nav.stats}</MenuLink>
        <DropdownMenuSeparator />
        <MenuLink href="/hesap">{t.nav.account}</MenuLink>
        {account?.isAdmin ? <MenuLink href="/panel/yonetim">{t.nav.admin}</MenuLink> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CurrentAccountMenu() {
  // The header outlives page changes; reading the path reads the account again after
  // each one (a new picture, a notification seen, a sign-out).
  const pathname = usePathname();
  const signedIn = useHasSession();
  const [account, setAccount] = useState<AccountSummary | null | undefined>(undefined);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { loadAccountSummary } = await import("./account-data");
        const summary = await loadAccountSummary();
        if (!cancelled) setAccount(summary);
      } catch {
        // Offline or the service is down: the menu still leads everywhere.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, load);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, load);
    };
  }, [signedIn, pathname]);

  // A session cookie that no longer holds a session (it ran out): the visitor signs in.
  if (!signedIn || account === null) return <SignInLink />;
  return <MemberMenu account={account ?? null} />;
}

/**
 * The right end of the header. Public pages are static and identical for everyone, so the
 * browser decides from the session cookie whether this says "Giriş" or shows the member's
 * menu, and only a member's browser loads the Supabase client to fill it in. Unread
 * notifications are counted on every page change and when the tab comes back into view;
 * there is no open connection.
 */
export function AccountMenu() {
  return (
    <Suspense fallback={<SignInLink />}>
      <CurrentAccountMenu />
    </Suspense>
  );
}
