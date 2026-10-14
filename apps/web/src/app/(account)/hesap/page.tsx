import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { format, t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";

import { signOut } from "../giris/actions";

import { DeleteAccountForm, ExportDataButton, ProfileForm } from "./account-forms";
import { AvatarField } from "./avatar-field";

export const metadata: Metadata = {
  title: t.account.title,
  description: t.account.description,
  robots: { index: false, follow: false },
};

const a = t.account;
const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

async function Account() {
  const { user, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, bio")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);
  // Asked for on its own: a database that does not have the column yet (code deployed
  // before its migration) then costs this one section, not the whole page.
  const avatar = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();

  return (
    <>
      <nav className="flex flex-wrap gap-x-5 gap-y-1 border-b border-border py-4 font-mono text-xs uppercase">
        <Link href="/panel" className={linkFocus}>
          {a.back}
        </Link>
        <Link href={profilePath(profile.username)} className={linkFocus}>
          {a.viewProfile}
        </Link>
      </nav>

      <SectionHeading index={1} title={a.profileSection} aside={`@${profile.username}`} />
      <ProfileForm
        initial={{
          username: profile.username,
          displayName: profile.display_name ?? "",
          bio: profile.bio ?? "",
        }}
      />

      {avatar.error ? null : (
        <>
          <SectionHeading index={2} title={t.photo.avatar.section} />
          <AvatarField initialPath={avatar.data.avatar_path} username={profile.username} />
        </>
      )}

      <SectionHeading index={3} title={a.exportSection} />
      <ExportDataButton />

      <SectionHeading index={4} title={a.sessionSection} />
      <div className="grid max-w-2xl gap-4 py-5">
        {user.email ? (
          <p className="font-mono text-sm">{format(a.signedInWith, { email: user.email })}</p>
        ) : null}
        <form action={signOut}>
          <Button type="submit" variant="outline" className="h-11 px-6 font-mono text-xs uppercase">
            {t.auth.signOut}
          </Button>
        </form>
      </div>

      <SectionHeading index={5} title={a.deleteSection} />
      <DeleteAccountForm />
    </>
  );
}

export default function AccountPage() {
  return (
    <PageShell>
      <PageHeading title={a.title} />
      <Suspense fallback={<Skeleton className="my-6 h-96 max-w-2xl" />}>
        <Account />
      </Suspense>
    </PageShell>
  );
}
