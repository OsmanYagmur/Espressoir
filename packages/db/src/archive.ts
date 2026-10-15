/**
 * The archive's read models, as the apps consume them. Rows from the `coffee_overview`,
 * `tasting_feed` and `brew_methods` relations are validated here and reshaped into
 * camelCase objects, so a schema change that would break the UI fails loudly at this
 * boundary instead of rendering "undefined" somewhere.
 *
 * Framework-free: web uses it today, the mobile app can use it unchanged.
 */
import {
  BREW_CATEGORIES,
  CAPSULE_SYSTEMS,
  COFFEE_FORMS,
  COFFEE_PROCESSES,
  FLAVOR_GROUPS,
  ROAST_LEVELS,
  TASTING_STATUSES,
  TASTING_VISIBILITIES,
} from "@espressoir/core";
import { z } from "zod";

import { brandPageRowSchema, type BrandPage } from "./business";
import { cafeRowSchema, cafeVisitRowSchema, type Cafe, type CafeVisit } from "./cafe";
import type { TypedSupabaseClient } from "./index";
import { listRowSchema, type MemberList } from "./list";
import { profileRowSchema, type Profile } from "./profile";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const taste = z.number().int().min(1).max(5).nullable();

export const coffeeRowSchema = z
  .object({
    coffee_id: z.uuid(),
    coffee_slug: z.string().min(1),
    coffee_name: z.string().min(1),
    form: z.enum(COFFEE_FORMS).nullable(),
    capsule_system: z.enum(CAPSULE_SYSTEMS).nullable(),
    brand_intensity: z.number().int().nullable(),
    origin_country: z.string().length(2).nullable(),
    region: z.string().nullable(),
    process: z.enum(COFFEE_PROCESSES).nullable(),
    roast_level: z.enum(ROAST_LEVELS).nullable(),
    is_blend: z.boolean().nullable(),
    description: z.string().nullable(),
    image_url: z.string().nullable(),
    created_at: z.string(),
    brand_id: z.uuid(),
    brand_slug: z.string().min(1),
    brand_name: z.string().min(1),
    tasting_count: z.number().int().nonnegative(),
    rated_count: z.number().int().nonnegative(),
    // Postgres `numeric` arrives as a JSON number from the API, as text from a raw driver.
    avg_score: z.coerce.number().nullable(),
    score_distribution: z.array(z.number().int().nonnegative()).length(10),
    first_tasted_at: day.nullable(),
    last_tasted_at: day.nullable(),
    brew_method_slugs: z.array(z.string()),
    // Absent until the community migration is applied; everything older was reviewed.
    is_reviewed: z.boolean().optional(),
  })
  .transform((row) => ({
    id: row.coffee_id,
    slug: row.coffee_slug,
    name: row.coffee_name,
    brand: { id: row.brand_id, slug: row.brand_slug, name: row.brand_name },
    form: row.form,
    capsuleSystem: row.capsule_system,
    brandIntensity: row.brand_intensity,
    originCountry: row.origin_country,
    region: row.region,
    process: row.process,
    roastLevel: row.roast_level,
    isBlend: row.is_blend,
    description: row.description,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    /** False for a coffee a member added that no admin has checked yet. */
    isReviewed: row.is_reviewed ?? true,
    stats: {
      tastingCount: row.tasting_count,
      ratedCount: row.rated_count,
      avgScore: row.avg_score,
      /** Index 0 = score 1 … index 9 = score 10. */
      distribution: row.score_distribution,
      firstTastedAt: row.first_tasted_at,
      lastTastedAt: row.last_tasted_at,
      brewMethodSlugs: row.brew_method_slugs,
    },
  }));

export const tastingRowSchema = z
  .object({
    tasting_id: z.uuid(),
    status: z.enum(TASTING_STATUSES),
    visibility: z.enum(TASTING_VISIBILITIES),
    score: z.number().int().min(1).max(10).nullable(),
    tasted_at: day.nullable(),
    notes: z.string().nullable(),
    device: z.string().nullable(),
    body: taste,
    acidity: taste,
    bitterness: taste,
    sweetness: taste,
    aftertaste: taste,
    would_buy_again: z.boolean().nullable(),
    created_at: z.string(),
    user_id: z.uuid(),
    username: z.string().min(1),
    display_name: z.string().nullable(),
    coffee_id: z.uuid(),
    coffee_slug: z.string().min(1),
    coffee_name: z.string().min(1),
    form: z.enum(COFFEE_FORMS).nullable(),
    brand_intensity: z.number().int().nullable(),
    origin_country: z.string().length(2).nullable(),
    brand_id: z.uuid(),
    brand_slug: z.string().min(1),
    brand_name: z.string().min(1),
    brew_method_slug: z.string().nullable(),
    brew_method_name: z.string().nullable(),
    brew_category: z.enum(BREW_CATEGORIES).nullable(),
    // Absent until the interaction migration is applied.
    like_count: z.number().int().nonnegative().optional(),
    comment_count: z.number().int().nonnegative().optional(),
    is_hidden: z.boolean().optional(),
    // Absent until the flavour tag migration is applied.
    flavor_tag_slugs: z.array(z.string().min(1)).optional(),
    flavor_tag_names: z.array(z.string().min(1)).optional(),
    // Absent until the media migration is applied.
    photo_path: z.string().nullable().optional(),
    photo_width: z.number().int().positive().nullable().optional(),
    photo_height: z.number().int().positive().nullable().optional(),
    photo_alt: z.string().nullable().optional(),
  })
  .transform((row) => ({
    id: row.tasting_id,
    status: row.status,
    visibility: row.visibility,
    score: row.score,
    tastedAt: row.tasted_at,
    notes: row.notes,
    device: row.device,
    profile: {
      body: row.body,
      acidity: row.acidity,
      bitterness: row.bitterness,
      sweetness: row.sweetness,
      aftertaste: row.aftertaste,
    },
    wouldBuyAgain: row.would_buy_again,
    /** Flavour tags, in the order of the reference list (`archive.flavorTags`). */
    tags: (row.flavor_tag_slugs ?? []).map((slug, index) => ({
      slug,
      name: row.flavor_tag_names?.[index] ?? slug,
    })),
    /** The tasting's picture: its path in the "media" bucket, its size, what it shows. */
    photo:
      row.photo_path && row.photo_width && row.photo_height
        ? {
            path: row.photo_path,
            width: row.photo_width,
            height: row.photo_height,
            alt: row.photo_alt ?? null,
          }
        : null,
    createdAt: row.created_at,
    likeCount: row.like_count ?? 0,
    /** Comments that are neither removed nor hidden. */
    commentCount: row.comment_count ?? 0,
    /** Hidden by an admin: only the author (and admins) ever receive such a row. */
    isHidden: row.is_hidden ?? false,
    author: { id: row.user_id, username: row.username, displayName: row.display_name },
    coffee: {
      id: row.coffee_id,
      slug: row.coffee_slug,
      name: row.coffee_name,
      form: row.form,
      brandIntensity: row.brand_intensity,
      originCountry: row.origin_country,
    },
    brand: { id: row.brand_id, slug: row.brand_slug, name: row.brand_name },
    brewMethod:
      row.brew_method_slug && row.brew_method_name && row.brew_category
        ? { slug: row.brew_method_slug, name: row.brew_method_name, category: row.brew_category }
        : null,
  }));

export const brewMethodRowSchema = z
  .object({
    id: z.uuid(),
    slug: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(BREW_CATEGORIES),
    sort_order: z.number().int(),
  })
  .transform((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    sortOrder: row.sort_order,
  }));

export const flavorTagRowSchema = z
  .object({
    id: z.uuid(),
    slug: z.string().min(1),
    name: z.string().min(1),
    tag_group: z.enum(FLAVOR_GROUPS),
    sort_order: z.number().int(),
  })
  .transform((row) => ({
    slug: row.slug,
    name: row.name,
    group: row.tag_group,
    sortOrder: row.sort_order,
  }));

export type Coffee = z.infer<typeof coffeeRowSchema>;
export type Tasting = z.infer<typeof tastingRowSchema>;
export type BrewMethod = z.infer<typeof brewMethodRowSchema>;
export type FlavorTag = z.infer<typeof flavorTagRowSchema>;

export interface Archive {
  coffees: Coffee[];
  tastings: Tasting[];
  brewMethods: BrewMethod[];
  /** The fixed list of flavour tags, in display order. */
  flavorTags: FlavorTag[];
  /** Members who have finished onboarding, with their public numbers. */
  profiles: Profile[];
  /** Public lists, with their entries. */
  lists: MemberList[];
  /** Every café, with its public numbers. */
  cafes: Cafe[];
  /** Public visits to cafés. */
  cafeVisits: CafeVisit[];
  /** Every brand's own page: description, website, official account. */
  brandPages: BrandPage[];
}

/** Raw rows of the relations, exactly as the API (or a snapshot file) returns them. */
export interface ArchiveRows {
  coffees: unknown[];
  tastings: unknown[];
  brewMethods: unknown[];
  /** Absent in snapshot files written before profiles existed. */
  profiles?: unknown[];
  /** Absent in snapshot files written before tags were read. */
  flavorTags?: unknown[];
  /** Absent in snapshot files written before lists existed. */
  lists?: unknown[];
  /** Absent in snapshot files written before cafés existed. */
  cafes?: unknown[];
  cafeVisits?: unknown[];
  /** Absent in snapshot files written before official accounts existed. */
  brandPages?: unknown[];
}

export function parseArchive(rows: ArchiveRows): Archive {
  return {
    coffees: z.array(coffeeRowSchema).parse(rows.coffees),
    tastings: z.array(tastingRowSchema).parse(rows.tastings),
    brewMethods: z.array(brewMethodRowSchema).parse(rows.brewMethods),
    flavorTags: z.array(flavorTagRowSchema).parse(rows.flavorTags ?? []),
    profiles: z.array(profileRowSchema).parse(rows.profiles ?? []),
    lists: z.array(listRowSchema).parse(rows.lists ?? []),
    cafes: z.array(cafeRowSchema).parse(rows.cafes ?? []),
    cafeVisits: z.array(cafeVisitRowSchema).parse(rows.cafeVisits ?? []),
    brandPages: z.array(brandPageRowSchema).parse(rows.brandPages ?? []),
  };
}

/**
 * The whole archive is one cached read (see the web app's `getArchive`). That stays a good
 * trade while it is small; past this size the read should be split into tagged reads.
 */
export const ARCHIVE_SPLIT_BYTES = 1_000_000;

/** Roughly what the archive weighs on the wire: its JSON, in characters. */
export function archiveSize(rows: ArchiveRows): number {
  return JSON.stringify(rows).length;
}

/** "No such relation", as Postgres and as the API's schema cache say it. */
const MISSING_RELATION = new Set(["42P01", "PGRST205"]);

/** The API caps a response at 1000 rows (supabase/config.toml: max_rows), so read in pages. */
const PAGE_SIZE = 1000;

async function readAll<Row>(
  what: string,
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: Row[] | null;
    error: { message: string; code?: string } | null;
  }>,
  { optional = false }: { optional?: boolean } = {},
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    // A relation the database does not have yet (code deployed before its migration):
    // an optional read is then empty rather than the end of the whole archive.
    if (error && optional && MISSING_RELATION.has(error.code ?? "")) return [];
    if (error) throw new Error(`${what} okunamadı: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/**
 * Everything the public archive shows: all coffees, every public tasting, the brew methods,
 * the flavour tags, the members and their public lists, the cafés and their public visits.
 * Works with any client; what comes back still depends on that client's rights (RLS).
 */
export async function fetchArchiveRows(client: TypedSupabaseClient): Promise<ArchiveRows> {
  const [
    coffees,
    tastings,
    brewMethods,
    profiles,
    flavorTags,
    lists,
    cafes,
    cafeVisits,
    brandPages,
  ] = await Promise.all([
    readAll("Kahveler", (from, to) =>
      client.from("coffee_overview").select("*").order("coffee_id").range(from, to),
    ),
    readAll("Tadımlar", (from, to) =>
      client
        .from("tasting_feed")
        .select("*")
        .eq("visibility", "public")
        .order("tasting_id")
        .range(from, to),
    ),
    readAll("Demleme yöntemleri", (from, to) =>
      client.from("brew_methods").select("*").order("sort_order").range(from, to),
    ),
    readAll("Profiller", (from, to) =>
      client.from("profile_overview").select("*").order("user_id").range(from, to),
    ),
    readAll("Tat etiketleri", (from, to) =>
      client.from("flavor_tags").select("*").order("sort_order").range(from, to),
    ),
    readAll(
      "Listeler",
      (from, to) =>
        client.from("list_feed").select("*").eq("is_public", true).order("list_id").range(from, to),
      { optional: true },
    ),
    readAll(
      "Kafeler",
      (from, to) => client.from("cafe_overview").select("*").order("cafe_id").range(from, to),
      { optional: true },
    ),
    readAll(
      "Kafe ziyaretleri",
      (from, to) =>
        client
          .from("cafe_visit_feed")
          .select("*")
          .eq("visibility", "public")
          .order("visit_id")
          .range(from, to),
      { optional: true },
    ),
    readAll(
      "Markalar",
      (from, to) => client.from("brand_pages").select("*").order("brand_id").range(from, to),
      { optional: true },
    ),
  ]);
  return {
    coffees,
    tastings,
    brewMethods,
    profiles,
    flavorTags,
    lists,
    cafes,
    cafeVisits,
    brandPages,
  };
}
