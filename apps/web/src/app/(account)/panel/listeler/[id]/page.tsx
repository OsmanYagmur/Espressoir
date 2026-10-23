import { LIST_ITEMS_MAX, LIST_NOTE_MAX_LENGTH } from "@espressoir/core";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { AddCoffeeToList, DeleteList, ListForm } from "@/components/panel/list-form";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
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

const link = "text-accent-ink underline underline-offset-3";

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
      <div className="flex flex-col items-start gap-3">
        <p className="text-ink-2">{p.notFound}</p>
        <Link href="/panel/listeler" className={link}>
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
      <nav className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/panel/listeler" className={link}>
          {p.back}
        </Link>
        {list.is_public && !list.hidden_at ? (
          <Link href={listPath(user.username, list.slug)} prefetch={false} className={link}>
            {p.view}
          </Link>
        ) : null}
      </nav>
      {list.hidden_at ? <p className="mt-6 rounded-md bg-sunk p-4">{l.hiddenNote}</p> : null}
      {error ? (
        <p role="alert" className="mt-6 font-medium text-danger">
          {error}
        </p>
      ) : null}

      <Section id="kahveler">
        <SectionHeading
          id="kahveler"
          title={p.itemsTitle}
          aside={<span className="type-figure">{items.length}</span>}
          hint={p.itemsHint}
        />
        {items.length === 0 ? (
          <p className="text-ink-2">{l.empty}</p>
        ) : (
          <ol aria-labelledby="kahveler" className="border-t border-line">
            {items.map((item, index) => (
              <li key={item.coffee_id} className="grid gap-3 border-b border-line py-4">
                <p className="[overflow-wrap:anywhere]">
                  <span className="mr-2 type-figure text-ink-2">{index + 1}</span>
                  <Link
                    href={coffeePath(item.coffee.brand.slug, item.coffee.slug)}
                    prefetch={false}
                    className="font-display font-semibold text-ink no-underline hover:underline"
                  >
                    {item.coffee.name}
                  </Link>{" "}
                  <span className="type-meta">{item.coffee.brand.name}</span>
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
                      className="h-9 min-w-48 flex-1"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {p.saveNote}
                    </Button>
                  </form>
                  <form action={moveListItem.bind(null, list.id, item.coffee_id, "up")}>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={index === 0}
                      aria-label={`${p.moveUp}: ${item.coffee.name}`}
                      size="sm"
                    >
                      <ArrowUpIcon aria-hidden />
                    </Button>
                  </form>
                  <form action={moveListItem.bind(null, list.id, item.coffee_id, "down")}>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={index === items.length - 1}
                      aria-label={`${p.moveDown}: ${item.coffee.name}`}
                      size="sm"
                    >
                      <ArrowDownIcon aria-hidden />
                    </Button>
                  </form>
                  <form action={removeListItem.bind(null, list.id, item.coffee_id)}>
                    <Button
                      type="submit"
                      variant="secondary"
                      aria-label={`${p.remove}: ${item.coffee.name}`}
                      size="sm"
                    >
                      {p.remove}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section id="kahve-ekle">
        <SectionHeading id="kahve-ekle" title={p.addTitle} />
        <AddCoffeeToList
          action={addListItem.bind(null, list.id)}
          catalog={coffees.filter((coffee) => !onList.has(coffee.id))}
        />
      </Section>

      <Section id="listeyi-duzenle">
        <SectionHeading id="listeyi-duzenle" title={p.editTitle} />
        <ListForm
          action={updateList.bind(null, list.id)}
          initial={{
            title: list.title,
            description: list.description ?? "",
            visibility: list.is_public ? "public" : "private",
          }}
          submitLabel={p.save}
        />
      </Section>

      <div className="mt-12">
        <DeleteList action={deleteList.bind(null, list.id)} />
      </div>
    </>
  );
}

export default function ListEditorPage(props: Props) {
  return (
    <PageShell width="read">
      <PageHeading title={p.editTitle} size="title" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ListEditor {...props} />
      </Suspense>
    </PageShell>
  );
}
