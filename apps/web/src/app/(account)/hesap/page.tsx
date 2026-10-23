import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
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
const link = "text-accent-ink underline underline-offset-3";

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
      <nav className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/panel" className={link}>
          {a.back}
        </Link>
        <Link href={profilePath(profile.username)} prefetch={false} className={link}>
          {a.viewProfile}
        </Link>
      </nav>

      <Section id="profil">
        <SectionHeading id="profil" title={a.profileSection} aside={`@${profile.username}`} />
        <ProfileForm
          initial={{
            username: profile.username,
            displayName: profile.display_name ?? "",
            bio: profile.bio ?? "",
          }}
        />
      </Section>

      {avatar.error ? null : (
        <Section id="fotograf">
          <SectionHeading id="fotograf" title={t.photo.avatar.section} />
          <AvatarField initialPath={avatar.data.avatar_path} username={profile.username} />
        </Section>
      )}

      <Section id="verilerin">
        <SectionHeading id="verilerin" title={a.exportSection} />
        <ExportDataButton />
      </Section>

      <Section id="oturum">
        <SectionHeading id="oturum" title={a.sessionSection} />
        <div className="flex flex-col items-start gap-4">
          {user.email ? <p>{format(a.signedInWith, { email: user.email })}</p> : null}
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              {t.auth.signOut}
            </Button>
          </form>
        </div>
      </Section>

      <Section id="hesabi-sil">
        <SectionHeading id="hesabi-sil" title={a.deleteSection} />
        <DeleteAccountForm />
      </Section>
    </>
  );
}

export default function AccountPage() {
  return (
    <PageShell width="read">
      <PageHeading title={a.title} size="title" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Account />
      </Suspense>
    </PageShell>
  );
}
