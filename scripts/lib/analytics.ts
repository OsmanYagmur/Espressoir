/**
 * The analysis export and the import of a model's suggestions (Phase 4A), as functions over
 * any Postgres connection so the database tests run them on PGlite. The commands are
 * scripts/export-analytics.ts and scripts/import-recommendations.ts.
 *
 * What leaves the database is what anyone can already read on the site, minus who wrote
 * it: public, logged, visible tastings, each member under a pseudonym that is stable
 * across exports (public.analytics_member_key) and means nothing without the database.
 * No usernames, notes, exact dates, prices or tasting ids (a tasting's page names its author).
 */
import { z } from "zod";

import type { Queryable } from "./postgres";

type Cell = string | number | boolean | null;
export type Table = { columns: readonly string[]; rows: Record<string, Cell>[] };

export interface AnalyticsExport {
  tastings: Table;
  coffees: Table;
  flavorTags: Table;
  brewMethods: Table;
}

async function table(db: Queryable, columns: readonly string[], sql: string): Promise<Table> {
  const { rows } = await db.query(sql);
  return { columns, rows: rows as Record<string, Cell>[] };
}

export async function readAnalyticsExport(db: Queryable): Promise<AnalyticsExport> {
  const tastings = await table(
    db,
    [
      "member_key",
      "coffee_id",
      "score",
      "body",
      "acidity",
      "bitterness",
      "sweetness",
      "aftertaste",
      "flavor_tags",
      "brew_method",
      "tasted_month",
      "would_buy_again",
    ],
    `select public.analytics_member_key(t.user_id) as member_key,
            t.coffee_id::text as coffee_id,
            t.score, t.body, t.acidity, t.bitterness, t.sweetness, t.aftertaste,
            coalesce((
              select string_agg(ft.slug, ';' order by ft.sort_order)
                from public.tasting_flavor_tags tft
                join public.flavor_tags ft on ft.id = tft.flavor_tag_id
               where tft.tasting_id = t.id
            ), '') as flavor_tags,
            bm.slug as brew_method,
            to_char(t.tasted_at, 'YYYY-MM') as tasted_month,
            t.would_buy_again
       from public.tastings t
       left join public.brew_methods bm on bm.id = t.brew_method_id
      where t.visibility = 'public' and t.status = 'logged' and t.hidden_at is null
      order by 1, t.tasted_at nulls last, 2, t.created_at`,
  );
  const coffees = await table(
    db,
    [
      "coffee_id",
      "brand_slug",
      "brand_name",
      "coffee_slug",
      "coffee_name",
      "form",
      "capsule_system",
      "brand_intensity",
      "origin_country",
      "process",
      "roast_level",
      "is_blend",
      "is_reviewed",
    ],
    `select c.id::text as coffee_id, b.slug as brand_slug, b.name as brand_name,
            c.slug as coffee_slug, c.name as coffee_name, c.form::text, c.capsule_system::text,
            c.brand_intensity, c.origin_country, c.process::text, c.roast_level::text,
            c.is_blend, c.reviewed_at is not null as is_reviewed
       from public.coffees c
       join public.brands b on b.id = c.brand_id
      order by b.name, c.name`,
  );
  const flavorTags = await table(
    db,
    ["slug", "name", "tag_group"],
    "select slug, name, tag_group::text from public.flavor_tags order by sort_order",
  );
  const brewMethods = await table(
    db,
    ["slug", "name", "category"],
    "select slug, name, category::text from public.brew_methods order by sort_order",
  );
  return { tastings, coffees, flavorTags, brewMethods };
}

/** RFC 4180: comma separated, quotes doubled, CRLF line ends; true/false and empty for null. */
export function toCsv({ columns, rows }: Table): string {
  const cell = (value: Cell | undefined) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return (
    [
      columns.join(","),
      ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}

export const ANALYTICS_README = `# Espressoir analiz verisi

\`pnpm export:analytics\` ile üretildi. Yalnızca sitede herkese açık olan, gizlenmemiş,
"tadıldı" durumundaki tadımlar; yazanın kim olduğu yerine kalıcı bir takma ad.

## tastings.csv (bir satır = bir tadım)

| sütun | anlamı |
| --- | --- |
| member_key | Üyenin takma adı (16 onaltılık karakter). Her dışa aktarmada aynı; veritabanı olmadan kişiye çevrilemez. |
| coffee_id | Kahve (coffees.csv). |
| score | Puan, 1–10; boş = puanlanmamış. |
| body, acidity, bitterness, sweetness, aftertaste | Gövde, asidite, acılık, tatlılık, bitiş; 1–5, boş = doldurulmamış. |
| flavor_tags | Tat etiketleri, \`;\` ile ayrılmış (flavor_tags.csv). |
| brew_method | Demleme yöntemi (brew_methods.csv); boş = bilinmiyor. |
| tasted_month | Tadım ayı (YYYY-AA); gün bilinçli olarak yok. |
| would_buy_again | Tekrar alır mı: true / false / boş. |

## coffees.csv, flavor_tags.csv, brew_methods.csv

Katalog: kahvenin markası, formu, kapsül sistemi, yoğunluğu, menşei (ISO ülke kodu), işlemi,
kavrum derecesi, harman olup olmadığı ve bir yöneticinin doğrulayıp doğrulamadığı; etiketler
ve demleme yöntemleri.

## Modelin sonuçlarını geri yüklemek

\`recommendations.csv\`: \`member_key,coffee_id,score,reason\` (reason isteğe bağlı, en fazla 140
karakter, üyeye gerekçe olarak gösterilir). Büyük score önce gösterilir.

    pnpm import:recommendations --file recommendations.csv --model defter-v1 [--dry-run] [--env prod]

Aynı model adıyla yeniden yükleme eskisinin yerini alır; \`--clear --model defter-v1\` siler.
Bu veriler takma adlıdır, anonim değildir: sitedeki herkese açık sayfalarla eşleştirilebilir.
Paylaşma; işin bitince sil.
`;

// ── importing a model's suggestions ─────────────────────────────────────────────────────

export const MODEL_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const recordSchema = z.object({
  member_key: z.string().regex(/^[0-9a-f]{16}$/, "member_key 16 onaltılık karakter olmalı"),
  coffee_id: z.uuid("coffee_id bir kahve kimliği (uuid) olmalı"),
  score: z
    .string()
    .trim()
    .min(1, "score boş")
    .transform(Number)
    .pipe(z.number("score bir sayı olmalı").finite("score bir sayı olmalı")),
  reason: z
    .string()
    .optional()
    .transform((value) => value?.trim().replace(/\s+/g, " ") || null)
    .pipe(z.string().max(140, "reason en fazla 140 karakter").nullable()),
});

export interface ImportPlan {
  model: string;
  rows: { userId: string; coffeeId: string; score: number; reason: string | null }[];
  members: number;
  problems: string[];
}

/**
 * Checks a model's output against the database and turns pseudonyms back into members.
 * Nothing is written; an import with any problem is refused as a whole.
 */
export async function planRecommendationImport(
  db: Queryable,
  model: string,
  records: readonly { line: number; values: Record<string, string> }[],
): Promise<ImportPlan> {
  const problems: string[] = [];
  if (!MODEL_PATTERN.test(model) || model.length > 40) {
    problems.push(`Model adı "${model}" geçersiz: küçük harf, rakam ve tire (en fazla 40).`);
  }

  const { rows: members } = await db.query(
    "select public.analytics_member_key(id) as key, id::text as id from public.profiles",
  );
  const memberByKey = new Map(members.map((row) => [row.key as string, row.id as string]));
  const { rows: coffees } = await db.query("select id::text as id from public.coffees");
  const coffeeIds = new Set(coffees.map((row) => row.id as string));

  const rows: ImportPlan["rows"] = [];
  const seen = new Set<string>();
  for (const { line, values } of records) {
    const parsed = recordSchema.safeParse(values);
    if (!parsed.success) {
      problems.push(
        `Satır ${line}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
      );
      continue;
    }
    const { member_key, coffee_id, score, reason } = parsed.data;
    const userId = memberByKey.get(member_key);
    if (!userId) problems.push(`Satır ${line}: ${member_key} takma adlı bir üye yok.`);
    if (!coffeeIds.has(coffee_id))
      problems.push(`Satır ${line}: ${coffee_id} kimlikli bir kahve yok.`);
    const pair = `${member_key}:${coffee_id}`;
    if (seen.has(pair)) problems.push(`Satır ${line}: aynı üye ve kahve ikinci kez.`);
    seen.add(pair);
    if (userId && coffeeIds.has(coffee_id))
      rows.push({ userId, coffeeId: coffee_id, score, reason });
  }

  return { model, rows, members: new Set(rows.map((row) => row.userId)).size, problems };
}

/** Replaces the model's suggestions with the plan's, inside the caller's transaction. */
export async function applyRecommendationImport(db: Queryable, plan: ImportPlan): Promise<void> {
  if (plan.problems.length > 0) throw new Error("Sorunlu bir yükleme uygulanamaz.");
  await db.query("delete from public.recommendations where model = $1", [plan.model]);
  if (plan.rows.length === 0) return;
  await db.query(
    `insert into public.recommendations (user_id, coffee_id, model, score, reason)
     select u, c, $1, s, r
       from unnest($2::uuid[], $3::uuid[], $4::real[], $5::text[]) as x(u, c, s, r)`,
    [
      plan.model,
      plan.rows.map((row) => row.userId),
      plan.rows.map((row) => row.coffeeId),
      plan.rows.map((row) => row.score),
      plan.rows.map((row) => row.reason),
    ],
  );
}
