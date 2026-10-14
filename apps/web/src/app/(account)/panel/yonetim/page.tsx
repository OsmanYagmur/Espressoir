import {
  MODERATION_NOTE_MAX_LENGTH,
  RESTRICTION_DAYS,
  siteConfig,
  type ReportTarget,
} from "@espressoir/core";
import type { TypedSupabaseClient } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { mediaUrl, smallMediaUrl } from "@/lib/media";
import { coffeePath, listPath, profilePath, tastingPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  cancelInvitation,
  removePhoto,
  inviteMember,
  mergeBrand,
  mergeCoffee,
  removeContent,
  resolveReport,
  restrictMember,
  reviewCoffee,
  setHidden,
} from "./actions";

export const metadata: Metadata = {
  title: t.admin.title,
  description: t.admin.description,
  robots: { index: false, follow: false },
};

type Props = PageProps<"/panel/yonetim">;

const a = t.admin;
const small = "h-9 px-3 font-mono text-xs uppercase";
const field = "h-9 text-sm";
const linkFocus =
  "underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

const excerpt = (text: string | null, length = 140) =>
  text ? (text.length > length ? `${text.slice(0, length)}…` : text) : "";
const day = (timestamp: string) => formatLongDay(timestamp.slice(0, 10));

/** An embedded row arrives as an object or a one-element list, depending on the relation. */
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** What a report points at, resolved to something an admin can read and act on. */
interface Target {
  type: ReportTarget;
  id: string;
  /** Who wrote it (or, for a profile, who it is): the account a restriction would hit. */
  userId: string | null;
  username: string | null;
  summary: string;
  href: ReturnType<typeof tastingPath> | null;
  hidden: boolean;
  /** The picture an admin can take down from this row (a tasting's, a member's). */
  photo: string | null;
}

/** What an admin can hide or remove (a profile is restricted, a coffee reviewed or merged). */
const HIDEABLE: ReadonlySet<ReportTarget> = new Set(["tasting", "comment", "list"]);

async function loadTargets(
  supabase: TypedSupabaseClient,
  wanted: { type: ReportTarget; id: string }[],
): Promise<Map<string, Target>> {
  const ids = (type: ReportTarget) => wanted.filter((w) => w.type === type).map((w) => w.id);
  const [tastings, comments, profiles, coffees, lists] = await Promise.all([
    supabase
      .from("tasting_feed")
      // Every column: those a database without the latest migration lacks are just absent.
      .select("*")
      .in("tasting_id", ids("tasting")),
    supabase
      .from("comments")
      .select(
        "id, tasting_id, user_id, body, hidden_at, author:profiles!comments_user_id_fkey(username)",
      )
      .in("id", ids("comment")),
    supabase.from("profiles").select("*").in("id", ids("profile")),
    supabase
      .from("coffee_overview")
      .select("coffee_id, coffee_name, coffee_slug, brand_name, brand_slug")
      .in("coffee_id", ids("coffee")),
    supabase
      .from("list_feed")
      .select("list_id, user_id, username, slug, title, is_hidden")
      .in("list_id", ids("list")),
  ]);

  const targets = new Map<string, Target>();
  for (const row of tastings.data ?? []) {
    if (!row.tasting_id) continue;
    targets.set(`tasting:${row.tasting_id}`, {
      type: "tasting",
      id: row.tasting_id,
      userId: row.user_id,
      username: row.username,
      summary: `${row.brand_name} ${row.coffee_name}${row.notes ? `: ${excerpt(row.notes)}` : ""}`,
      href: tastingPath(row.tasting_id),
      hidden: row.is_hidden === true,
      photo: row.photo_path ?? null,
    });
  }
  for (const row of comments.data ?? []) {
    targets.set(`comment:${row.id}`, {
      type: "comment",
      id: row.id,
      userId: row.user_id,
      username: one(row.author)?.username ?? null,
      summary: excerpt(row.body) || t.social.deleted,
      href: tastingPath(row.tasting_id),
      hidden: row.hidden_at !== null,
      photo: null,
    });
  }
  for (const row of profiles.data ?? []) {
    targets.set(`profile:${row.id}`, {
      type: "profile",
      id: row.id,
      userId: row.id,
      username: row.username,
      summary: `@${row.username}`,
      href: profilePath(row.username),
      hidden: false,
      photo: row.avatar_path ?? null,
    });
  }
  for (const row of coffees.data ?? []) {
    if (!row.coffee_id || !row.brand_slug || !row.coffee_slug) continue;
    targets.set(`coffee:${row.coffee_id}`, {
      type: "coffee",
      id: row.coffee_id,
      userId: null,
      username: null,
      summary: `${row.brand_name} — ${row.coffee_name}`,
      href: coffeePath(row.brand_slug, row.coffee_slug),
      hidden: false,
      photo: null,
    });
  }
  for (const row of lists.data ?? []) {
    if (!row.list_id || !row.username || !row.slug) continue;
    targets.set(`list:${row.list_id}`, {
      type: "list",
      id: row.list_id,
      userId: row.user_id,
      username: row.username,
      summary: row.title ?? "",
      href: listPath(row.username, row.slug),
      hidden: row.is_hidden === true,
      photo: null,
    });
  }
  return targets;
}

/** The picture itself (small), and the button that takes it down: file and all. */
function PhotoForm({ target }: { target: Pick<Target, "type" | "id" | "photo"> }) {
  const src = target.photo
    ? target.type === "tasting"
      ? smallMediaUrl(target.photo)
      : mediaUrl(target.photo)
    : null;
  return (
    <form action={removePhoto} className="flex flex-wrap items-center gap-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- already the right size
        <img
          src={src}
          alt=""
          width={48}
          height={48}
          className="size-12 border border-border object-cover"
        />
      ) : null}
      <input type="hidden" name="targetType" value={target.type} />
      <input type="hidden" name="targetId" value={target.id} />
      <Button type="submit" variant="outline" className={small}>
        {t.photo.admin.remove}
      </Button>
    </form>
  );
}

function HideForm({ target, hidden }: { target: Pick<Target, "type" | "id">; hidden: boolean }) {
  return (
    <form action={setHidden} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="targetType" value={target.type} />
      <input type="hidden" name="targetId" value={target.id} />
      <input type="hidden" name="hide" value={hidden ? "0" : "1"} />
      {hidden ? null : (
        <Input
          name="reason"
          aria-label={a.reason}
          placeholder={a.reason}
          maxLength={MODERATION_NOTE_MAX_LENGTH}
          className={`${field} w-44`}
        />
      )}
      <Button type="submit" variant="outline" className={small}>
        {hidden ? a.unhide : a.hide}
      </Button>
    </form>
  );
}

function RemoveForm({ target }: { target: Pick<Target, "type" | "id"> }) {
  return (
    <form action={removeContent} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="targetType" value={target.type} />
      <input type="hidden" name="targetId" value={target.id} />
      <label className="flex items-center gap-1.5 font-mono text-xs">
        <input type="checkbox" name="sure" required className="accent-foreground" />
        {a.sure}
      </label>
      <Button type="submit" variant="destructive" className={small}>
        {a.remove}
      </Button>
    </form>
  );
}

/** Restrict one member. Without `userId` the form asks for a username instead. */
function RestrictForm({ userId }: { userId?: string }) {
  return (
    <form action={restrictMember} className="flex flex-wrap items-center gap-2">
      {userId ? (
        <input type="hidden" name="userId" value={userId} />
      ) : (
        <Input
          name="username"
          aria-label={a.username}
          placeholder={a.username}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className={`${field} w-40`}
        />
      )}
      <Select name="days" aria-label={a.restrictDays} defaultValue="7" className={`${field} w-28`}>
        {RESTRICTION_DAYS.map((days) => (
          <option key={days} value={days}>
            {format(a.days, { count: days })}
          </option>
        ))}
      </Select>
      <Input
        name="reason"
        aria-label={a.reason}
        placeholder={a.reason}
        maxLength={MODERATION_NOTE_MAX_LENGTH}
        className={`${field} w-44`}
      />
      <Button type="submit" variant="outline" className={small}>
        {a.restrict}
      </Button>
    </form>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="border-b border-border py-5 text-muted-foreground">{children}</p>;
}

// An invitation's link runs out within the hour, so the time it was sent matters.
const sentFormat = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

/**
 * Invitations: the way in while signup is closed. Uses the secret key (see
 * lib/supabase/admin.ts), and is rendered only after requireAdmin() in AdminPanel.
 */
async function Invitations() {
  const admin = createAdminClient();
  if (!admin) return <Empty>{a.invites.unavailable}</Empty>;

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const pending = (data?.users ?? [])
    .filter((user) => user.invited_at && !user.email_confirmed_at && user.email)
    .sort((x, y) => (y.invited_at ?? "").localeCompare(x.invited_at ?? ""));

  return (
    <>
      <form action={inviteMember} className="grid gap-3 border-b border-border py-4">
        <p className="max-w-[62ch] text-sm text-muted-foreground">{a.invites.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="email"
            name="email"
            aria-label={a.invites.email}
            placeholder={a.invites.email}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={`${field} w-72 max-w-full`}
          />
          <Button type="submit" className={small}>
            {a.invites.send}
          </Button>
        </div>
      </form>

      <p className="label-caps pt-4 text-muted-foreground">{a.invites.pendingTitle}</p>
      {error ? (
        <Empty>{a.invites.listFailed}</Empty>
      ) : pending.length === 0 ? (
        <Empty>{a.invites.pendingEmpty}</Empty>
      ) : (
        <ul aria-label={a.invites.pendingTitle}>
          {pending.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
            >
              <p className="min-w-0 [overflow-wrap:anywhere]">
                <span className="font-mono text-sm">{user.email}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {format(a.invites.sentAt, {
                    date: sentFormat.format(new Date(user.invited_at!)),
                  })}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <form action={inviteMember}>
                  <input type="hidden" name="email" value={user.email} />
                  <Button type="submit" variant="outline" className={small}>
                    {a.invites.resend}
                  </Button>
                </form>
                <form action={cancelInvitation}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="outline" className={small}>
                    {a.invites.cancel}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Reports({ supabase }: { supabase: TypedSupabaseClient }) {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, details, created_at, reporter:profiles!reports_reporter_id_fkey(username)",
    )
    .eq("status", "open")
    .order("created_at");
  if (error) throw new Error(error.message);
  if (data.length === 0) return <Empty>{a.reportsEmpty}</Empty>;

  const targets = await loadTargets(
    supabase,
    data.map((report) => ({ type: report.target_type, id: report.target_id })),
  );

  return (
    <ul aria-label={a.reportsTitle}>
      {data.map((report) => {
        const target = targets.get(`${report.target_type}:${report.target_id}`);
        const reporter = one(report.reporter)?.username;
        return (
          <li key={report.id} className="grid gap-3 border-b border-border py-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                <span className="mr-2 border border-foreground px-1.5 py-0.5 text-foreground uppercase">
                  {a.targets[report.target_type]}
                </span>
                {t.social.reportReasons[report.reason]} · {day(report.created_at)} ·{" "}
                {format(a.reportedBy, { reporter: reporter ? `@${reporter}` : a.reporterGone })}
              </p>
              {target ? (
                <p className="mt-1.5 [overflow-wrap:anywhere]">
                  {target.username && target.type !== "profile" ? (
                    <span className="font-mono text-xs">@{target.username} · </span>
                  ) : null}
                  {target.summary}{" "}
                  {target.href ? (
                    <Link
                      href={target.href}
                      prefetch={false}
                      className={`font-mono text-xs ${linkFocus}`}
                    >
                      {a.open}
                    </Link>
                  ) : null}
                </p>
              ) : (
                <p className="mt-1.5 text-muted-foreground">{a.targetGone}</p>
              )}
              {report.details ? (
                <p className="mt-1 max-w-[62ch] border-l-2 border-rule pl-3 text-sm whitespace-pre-line">
                  {report.details}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {target && HIDEABLE.has(target.type) ? (
                <>
                  <HideForm target={target} hidden={target.hidden} />
                  <RemoveForm target={target} />
                </>
              ) : null}
              {target?.photo ? <PhotoForm target={target} /> : null}
              {target?.userId ? <RestrictForm userId={target.userId} /> : null}
            </div>
            <form action={resolveReport} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="reportId" value={report.id} />
              <Input
                name="note"
                aria-label={a.note}
                placeholder={a.note}
                maxLength={MODERATION_NOTE_MAX_LENGTH}
                className={`${field} w-56`}
              />
              <Button type="submit" name="status" value="resolved" className={small}>
                {a.resolve}
              </Button>
              <Button
                type="submit"
                name="status"
                value="dismissed"
                variant="outline"
                className={small}
              >
                {a.dismiss}
              </Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

async function Catalog({ supabase }: { supabase: TypedSupabaseClient }) {
  const [coffees, brands] = await Promise.all([
    supabase
      .from("coffee_overview")
      .select(
        "coffee_id, coffee_name, coffee_slug, brand_name, brand_slug, is_reviewed, tasting_count",
      )
      .order("brand_name")
      .order("coffee_name"),
    supabase.from("brands").select("id, name").order("name"),
  ]);
  if (coffees.error) throw new Error(coffees.error.message);
  if (brands.error) throw new Error(brands.error.message);

  const all = coffees.data.flatMap((coffee) =>
    coffee.coffee_id && coffee.brand_slug && coffee.coffee_slug
      ? [{ ...coffee, id: coffee.coffee_id, label: `${coffee.brand_name} — ${coffee.coffee_name}` }]
      : [],
  );
  const pending = all.filter((coffee) => coffee.is_reviewed === false);

  return (
    <>
      <SectionHeading index={5} title={a.catalogTitle} aside={pending.length} />
      {pending.length === 0 ? (
        <Empty>{a.catalogEmpty}</Empty>
      ) : (
        <ul aria-label={a.catalogTitle}>
          {pending.map((coffee) => (
            <li key={coffee.id} className="grid gap-3 border-b border-border py-4">
              <p className="[overflow-wrap:anywhere]">
                <Link
                  href={coffeePath(coffee.brand_slug!, coffee.coffee_slug!)}
                  prefetch={false}
                  className={`font-semiwide font-bold ${linkFocus}`}
                >
                  {coffee.label}
                </Link>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {format(t.coffee.tastingCount, { count: coffee.tasting_count ?? 0 })}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <form action={reviewCoffee}>
                  <input type="hidden" name="coffeeId" value={coffee.id} />
                  <Button type="submit" className={small}>
                    {a.review}
                  </Button>
                </form>
                <form action={mergeCoffee} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="from" value={coffee.id} />
                  <Select
                    name="into"
                    aria-label={a.mergeInto}
                    required
                    defaultValue=""
                    className={`${field} w-64`}
                  >
                    <option value="">
                      {a.mergeInto}: {a.choose}
                    </option>
                    {all
                      .filter((other) => other.id !== coffee.id)
                      .map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.label}
                        </option>
                      ))}
                  </Select>
                  <label className="flex items-center gap-1.5 font-mono text-xs">
                    <input type="checkbox" name="sure" required className="accent-foreground" />
                    {a.sure}
                  </label>
                  <Button type="submit" variant="outline" className={small}>
                    {a.merge}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SectionHeading index={6} title={a.brandsTitle} />
      <form action={mergeBrand} className="grid max-w-2xl gap-3 border-b border-border py-4">
        <p className="max-w-[62ch] text-sm text-muted-foreground">{a.brandsHint}</p>
        <div className="flex flex-wrap items-center gap-2">
          {(["from", "into"] as const).map((name) => (
            <Select
              key={name}
              name={name}
              aria-label={name === "from" ? a.mergeFrom : a.mergeTarget}
              required
              defaultValue=""
              className={`${field} w-56`}
            >
              <option value="">{name === "from" ? a.mergeFrom : a.mergeTarget}</option>
              {brands.data.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          ))}
          <label className="flex items-center gap-1.5 font-mono text-xs">
            <input type="checkbox" name="sure" required className="accent-foreground" />
            {a.sure}
          </label>
          <Button type="submit" variant="outline" className={small}>
            {a.merge}
          </Button>
        </div>
      </form>
    </>
  );
}

async function Hidden({ supabase }: { supabase: TypedSupabaseClient }) {
  const [tastings, comments, lists] = await Promise.all([
    supabase
      .from("tasting_feed")
      .select("tasting_id, username, brand_name, coffee_name, notes")
      .eq("is_hidden", true),
    supabase
      .from("comments")
      .select(
        "id, tasting_id, body, hidden_reason, author:profiles!comments_user_id_fkey(username)",
      )
      .not("hidden_at", "is", null),
    supabase.from("list_feed").select("list_id, username, title").eq("is_hidden", true),
  ]);
  const rows = [
    ...(tastings.data ?? []).flatMap((row) =>
      row.tasting_id
        ? [
            {
              type: "tasting" as const,
              id: row.tasting_id,
              username: row.username,
              summary: `${row.brand_name} ${row.coffee_name}${row.notes ? `: ${excerpt(row.notes)}` : ""}`,
            },
          ]
        : [],
    ),
    ...(comments.data ?? []).map((row) => ({
      type: "comment" as const,
      id: row.id,
      username: one(row.author)?.username ?? null,
      summary: excerpt(row.body),
    })),
    ...(lists.data ?? []).flatMap((row) =>
      row.list_id
        ? [
            {
              type: "list" as const,
              id: row.list_id,
              username: row.username,
              summary: row.title ?? "",
            },
          ]
        : [],
    ),
  ];
  if (rows.length === 0) return <Empty>{a.hiddenEmpty}</Empty>;

  return (
    <ul aria-label={a.hiddenTitle}>
      {rows.map((row) => (
        <li
          key={`${row.type}:${row.id}`}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
        >
          <p className="min-w-0 [overflow-wrap:anywhere]">
            <span className="mr-2 border border-foreground px-1.5 py-0.5 font-mono text-xs uppercase">
              {a.targets[row.type]}
            </span>
            {row.username ? <span className="font-mono text-xs">@{row.username} · </span> : null}
            {row.summary}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <HideForm target={row} hidden />
            <RemoveForm target={row} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Restricted({ supabase }: { supabase: TypedSupabaseClient }) {
  const { data } = await supabase
    .from("profile_private")
    .select("profile_id, restricted_until, restricted_reason, profile:profiles(username)")
    .gt("restricted_until", new Date().toISOString())
    .order("restricted_until");

  return (
    <>
      {!data || data.length === 0 ? (
        <Empty>{a.restrictedEmpty}</Empty>
      ) : (
        <ul aria-label={a.restrictedTitle}>
          {data.map((row) => (
            <li
              key={row.profile_id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3"
            >
              <p>
                <span className="font-mono text-sm">@{one(row.profile)?.username}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {format(a.restrictedUntil, { date: day(row.restricted_until!) })}
                  {row.restricted_reason ? ` · ${row.restricted_reason}` : ""}
                </span>
              </p>
              <form action={restrictMember}>
                <input type="hidden" name="userId" value={row.profile_id} />
                <input type="hidden" name="days" value="" />
                <Button type="submit" variant="outline" className={small}>
                  {a.unrestrict}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="border-b border-border py-4">
        <p className="label-caps mb-2 text-muted-foreground">{a.restrictTitle}</p>
        <RestrictForm />
      </div>
    </>
  );
}

async function Log({ supabase }: { supabase: TypedSupabaseClient }) {
  const { data } = await supabase
    .from("moderation_log")
    .select("id, action, target_type, note, created_at, admin:profiles(username)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (!data || data.length === 0) return <Empty>{a.logEmpty}</Empty>;

  return (
    <ul aria-label={a.logTitle} className="font-mono text-xs">
      {data.map((entry) => (
        <li key={entry.id} className="border-b border-border py-2">
          <span className="text-muted-foreground">{day(entry.created_at)}</span> · @
          {one(entry.admin)?.username ?? "—"}{" "}
          {a.actions[entry.action as keyof typeof a.actions] ?? entry.action}
          {entry.note ? <span className="text-muted-foreground"> · {entry.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

// Everything here is the admin's own view of the database, read on each request. The
// database checks the role again for every row and every action.
//
// Links from here to public pages carry prefetch={false}. A link scrolled into view is
// fetched ahead, and the button beside it changes that very page: a fetch that starts just
// before the change and finishes just after it is cached as if it were current, and the
// page then shows the old state (a reviewed coffee still "not reviewed") for up to an hour.
async function AdminPanel({ searchParams }: Pick<Props, "searchParams">) {
  const { supabase } = await requireAdmin();
  const { hata, tamam } = await searchParams;
  const reason =
    typeof hata === "string"
      ? (a.errors[hata as keyof typeof a.errors] ?? a.errors.unknown)
      : undefined;
  // How much of the free plan's 1 GB the pictures take (nothing shown if it cannot be read).
  const { data: usage } = await supabase.rpc("media_usage_v1");
  const stored = usage?.[0];

  return (
    <>
      <nav className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border py-4 font-mono text-xs">
        <Link href="/panel" className={`uppercase ${linkFocus}`}>
          {a.back}
        </Link>
        {stored ? (
          <p className="text-muted-foreground">
            {format(t.photo.admin.usage, {
              files: stored.files,
              size: Math.round((Number(stored.bytes) / 1024 / 1024) * 10) / 10,
            })}
          </p>
        ) : null}
      </nav>
      {reason ? (
        <p
          role="alert"
          className="mt-4 border-l-2 border-destructive pl-3 font-mono text-sm text-destructive"
        >
          {format(a.failed, { reason })}
        </p>
      ) : tamam ? (
        <p role="status" className="mt-4 border-l-2 border-rule pl-3 font-mono text-sm">
          {a.done}
        </p>
      ) : null}

      <SectionHeading index={1} title={a.invites.title} />
      <Invitations />
      <SectionHeading index={2} title={a.reportsTitle} />
      <Reports supabase={supabase} />
      <SectionHeading index={3} title={a.hiddenTitle} />
      <Hidden supabase={supabase} />
      <SectionHeading index={4} title={a.restrictedTitle} />
      <Restricted supabase={supabase} />
      <Catalog supabase={supabase} />
      <SectionHeading index={7} title={a.logTitle} />
      <Log supabase={supabase} />
    </>
  );
}

export default function AdminPage({ searchParams }: Props) {
  return (
    <PageShell>
      <PageHeading title={a.title} />
      <Suspense fallback={<Skeleton className="my-6 h-96" />}>
        <AdminPanel searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
