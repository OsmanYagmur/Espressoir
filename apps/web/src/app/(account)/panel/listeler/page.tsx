import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ListForm } from "@/components/panel/list-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
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

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

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
      <nav className="border-b border-border py-4 font-mono text-xs uppercase">
        <Link href="/panel" className={linkFocus}>
          {t.admin.back}
        </Link>
      </nav>

      <SectionHeading index={1} title={p.mine} aside={data.length} />
      {data.length === 0 ? (
        <p className="border-b border-border py-6 text-muted-foreground">{p.none}</p>
      ) : (
        <ul aria-label={p.mine}>
          {data.map((list) => (
            <li
              key={list.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3"
            >
              <Link
                href={`/panel/listeler/${list.id}` as Route}
                className={`font-semiwide text-lg font-bold [overflow-wrap:anywhere] ${linkFocus}`}
              >
                {list.title}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">
                {format(l.itemCount, { count: list.list_items.length })}
                {" · "}
                {list.is_public ? l.public : l.private}
                {list.hidden_at ? (
                  <span className="ml-2 border border-foreground px-1.5 py-0.5 text-foreground uppercase">
                    {l.hidden}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}

      <SectionHeading index={2} title={p.newTitle} />
      <ListForm
        action={createList}
        initial={{ title: "", description: "", visibility: "public" }}
        submitLabel={p.create}
      />
    </>
  );
}

export default function MyListsPage() {
  return (
    <PageShell>
      <PageHeading title={p.title} lead={p.lead} />
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <MyLists />
      </Suspense>
    </PageShell>
  );
}
