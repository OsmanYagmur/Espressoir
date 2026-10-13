import { LIST_ITEMS_MAX, LIST_NOTE_MAX_LENGTH } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { AddCoffeeToList, DeleteList, ListForm } from "@/components/panel/list-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { format, t } from "@/lib/i18n";
import { coffeePath, listPath } from "@/lib/routes";

import {
  addListItem,
  deleteList,
  moveListItem,
  removeListItem,
  setListItemNote,
  updateList,
} from "../actions";

type Props = PageProps<"/panel/listeler/[id]">;

const l = t.lists;
const p = l.panel;

export const metadata: Metadata = {
  title: p.editTitle,
  robots: { index: false, follow: false },
};

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";
const small = "h-9 px-3 font-mono text-xs uppercase";

/** What a refused change says, by the short code the action put in the address. */
function editorError(code: string | string[] | undefined): string | null {
  if (typeof code !== "string") return null;
  if (code === "dolu") return format(l.add.full, { max: LIST_ITEMS_MAX });
  if (code === "var") return l.errors.duplicate;
  if (code === "kisitli") return l.add.restricted;
  if (code === "not") return format(l.errors.noteTooLong, { max: LIST_NOTE_MAX_LENGTH });
  return l.errors.failed;
}

async function ListEditor({ params, searchParams }: Props) {
  const { id } = await params;
  const { hata } = await searchParams;
  const { user, supabase } = await requireUser();

  // Row level security shows a member their own lists; the owner filter keeps other
  // people's public ones out of this editor.
  const { data: list } = z.uuid().safeParse(id).success
    ? await supabase
        .from("lists")
        .select(
          "id, slug, title, description, is_public, hidden_at, items:list_items(coffee_id, note, position, created_at, coffee:coffees(name, slug, brand:brands(name, slug)))",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!list) {
    return (
      <div className="border-b border-border py-8">
        <p className="text-muted-foreground">{p.notFound}</p>
        <Link
          href="/panel/listeler"
          className="mt-3 inline-block font-mono text-xs uppercase underline"
        >
          {p.back}
        </Link>
      </div>
    );
  }

  const items = [...list.items].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
  const onList = new Set(items.map((item) => item.coffee_id));
  // The catalog for the search box, straight from the database: the cached archive is
  // left alone here, so that saving twice in a row does not race its own refresh.
  const { data: catalog } = await supabase
    .from("coffee_overview")
    .select("coffee_id, coffee_name, brand_name")
    .order("brand_name")
    .order("coffee_name");
  const coffees = (catalog ?? []).flatMap((row) =>
    row.coffee_id ? [{ id: row.coffee_id, label: `${row.brand_name} — ${row.coffee_name}` }] : [],
  );
  const error = editorError(hata);

  return (
    <>
      <nav className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border py-4 font-mono text-xs uppercase">
        <Link href="/panel/listeler" className={linkFocus}>
          {p.back}
        </Link>
        {list.is_public && !list.hidden_at ? (
          <Link href={listPath(user.username, list.slug)} prefetch={false} className={linkFocus}>
            {p.view} →
          </Link>
        ) : null}
      </nav>
      {list.hidden_at ? (
        <p className="mt-4 border-l-2 border-foreground pl-3 font-mono text-sm">{l.hiddenNote}</p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 border-l-2 border-destructive pl-3 font-mono text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <SectionHeading index={1} title={p.itemsTitle} aside={items.length} hint={p.itemsHint} />
      {items.length === 0 ? (
        <p className="border-b border-border py-6 text-muted-foreground">{l.empty}</p>
      ) : (
        <ol aria-label={p.itemsTitle}>
          {items.map((item, index) => (
            <li key={item.coffee_id} className="grid gap-3 border-b border-border py-4">
              <p className="[overflow-wrap:anywhere]">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{index + 1}</span>
                <Link
                  href={coffeePath(item.coffee.brand.slug, item.coffee.slug)}
                  prefetch={false}
                  className={`font-semiwide font-bold ${linkFocus}`}
                >
                  {item.coffee.name}
                </Link>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {item.coffee.brand.name}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <form
                  action={setListItemNote.bind(null, list.id, item.coffee_id)}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                >
                  <Input
                    name="note"
                    aria-label={`${p.note}: ${item.coffee.name}`}
                    placeholder={p.note}
                    maxLength={LIST_NOTE_MAX_LENGTH}
                    defaultValue={item.note ?? ""}
                    autoComplete="off"
                    className="h-9 min-w-48 flex-1 text-sm"
                  />
                  <Button type="submit" variant="outline" className={small}>
                    {p.saveNote}
                  </Button>
                </form>
                <form action={moveListItem.bind(null, list.id, item.coffee_id, "up")}>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={index === 0}
                    aria-label={`${p.moveUp}: ${item.coffee.name}`}
                    className={small}
                  >
                    ↑
                  </Button>
                </form>
                <form action={moveListItem.bind(null, list.id, item.coffee_id, "down")}>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={index === items.length - 1}
                    aria-label={`${p.moveDown}: ${item.coffee.name}`}
                    className={small}
                  >
                    ↓
                  </Button>
                </form>
                <form action={removeListItem.bind(null, list.id, item.coffee_id)}>
                  <Button
                    type="submit"
                    variant="outline"
                    aria-label={`${p.remove}: ${item.coffee.name}`}
                    className={small}
                  >
                    {p.remove}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}

      <SectionHeading index={2} title={p.addTitle} />
      <AddCoffeeToList
        action={addListItem.bind(null, list.id)}
        catalog={coffees.filter((coffee) => !onList.has(coffee.id))}
      />

      <SectionHeading index={3} title={p.editTitle} />
      <ListForm
        action={updateList.bind(null, list.id)}
        initial={{
          title: list.title,
          description: list.description ?? "",
          visibility: list.is_public ? "public" : "private",
        }}
        submitLabel={p.save}
      />

      <div className="max-w-2xl pt-5 pb-10">
        <DeleteList action={deleteList.bind(null, list.id)} />
      </div>
    </>
  );
}

export default function ListEditorPage(props: Props) {
  return (
    <PageShell>
      <PageHeading title={p.editTitle} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <ListEditor {...props} />
      </Suspense>
    </PageShell>
  );
}
