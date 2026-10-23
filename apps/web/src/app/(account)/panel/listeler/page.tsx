import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListForm } from "@/components/panel/list-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { format, t } from "@/lib/i18n";

import { createList } from "./actions";

const l = t.lists;
const p = l.panel;

export const metadata: Metadata = {
  title: p.title,
  description: p.description,
  robots: { index: false, follow: false },
};

const link = "text-accent-ink underline underline-offset-3";

// The member's own lists, private and hidden ones included, read on each request.
async function MyLists() {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase
    .from("lists")
    .select("id, title, is_public, hidden_at, list_items(coffee_id)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <>
      <nav>
        <Link href="/panel" className={link}>
          {t.admin.back}
        </Link>
      </nav>

      <Section id="listelerim">
        <SectionHeading
          id="listelerim"
          title={p.mine}
          aside={<span className="type-figure">{data.length}</span>}
        />
        {data.length === 0 ? (
          <p className="text-ink-2">{p.none}</p>
        ) : (
          <ul aria-labelledby="listelerim" className="border-t border-line">
            {data.map((list) => (
              <li
                key={list.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3"
              >
                <Link
                  href={`/panel/listeler/${list.id}` as Route}
                  className="font-display text-lg font-semibold [overflow-wrap:anywhere] text-ink no-underline hover:underline"
                >
                  {list.title}
                </Link>
                <p className="type-meta">
                  {format(l.itemCount, { count: list.list_items.length })}
                  {" · "}
                  {list.is_public ? l.public : l.private}
                  {list.hidden_at ? <Chip className="ml-2">{l.hidden}</Chip> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="yeni-liste">
        <SectionHeading id="yeni-liste" title={p.newTitle} />
        <ListForm
          action={createList}
          initial={{ title: "", description: "", visibility: "public" }}
          submitLabel={p.create}
        />
      </Section>
    </>
  );
}

export default function MyListsPage() {
  return (
    <PageShell width="read">
      <PageHeading title={p.title} lead={p.lead} size="title" />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <MyLists />
      </Suspense>
    </PageShell>
  );
}
