/**
 * Writes an import plan to the database. Insert-only and idempotent: anything that already
 * exists is left exactly as it is (the website may have edited it since) and only counted.
 * The caller owns the transaction, so a dry run is simply "apply, then roll back".
 */
import type { Queryable } from "../lib/postgres";

import type { Finding, ImportPlan, PlannedCoffee } from "./plan";

export interface Tally {
  created: number;
  existing: number;
}

export interface ApplyResult {
  brands: Tally;
  coffees: Tally;
  tastings: Tally;
  wishlist: Tally;
  aliasesAdded: number;
  /** What differs between the file and rows that were already in the database. */
  findings: Finding[];
}

const COFFEE_FIELDS = [
  ["form", "form", "form"],
  ["capsuleSystem", "capsule_system", "kapsül sistemi"],
  ["brandIntensity", "brand_intensity", "yoğunluk"],
  ["originCountry", "origin_country", "menşe"],
  ["isBlend", "is_blend", "harman"],
] as const satisfies ReadonlyArray<readonly [keyof PlannedCoffee, string, string]>;

export async function applyImportPlan(
  db: Queryable,
  plan: ImportPlan,
  options: { ownerUsername: string },
): Promise<ApplyResult> {
  const one = async (text: string, params: unknown[] = []) =>
    (await db.query(text, params)).rows[0];

  const owner = await one("select id from public.profiles where username = $1", [
    options.ownerUsername,
  ]);
  if (!owner) {
    throw new Error(
      `"${options.ownerUsername}" kullanıcı adlı profil yok. Önce \`pnpm admin:bootstrap\` çalıştır.`,
    );
  }
  const ownerId = owner.id as string;

  const methods = new Map(
    (await db.query("select slug, id from public.brew_methods")).rows.map((row) => [
      row.slug as string,
      row.id as string,
    ]),
  );

  const result: ApplyResult = {
    brands: { created: 0, existing: 0 },
    coffees: { created: 0, existing: 0 },
    tastings: { created: 0, existing: 0 },
    wishlist: { created: 0, existing: 0 },
    aliasesAdded: 0,
    findings: [],
  };

  // ── brands ────────────────────────────────────────────────────────────────────────────
  const brandIds = new Map<string, string>();
  for (const brand of plan.brands) {
    const found = await one(
      "select id, name, aliases from public.brands where id = public.find_brand_id($1)",
      [brand.name],
    );
    if (!found) {
      const created = await one(
        "insert into public.brands (name, aliases, created_by) values ($1, $2, $3) returning id",
        [brand.name, brand.aliases, ownerId],
      );
      brandIds.set(brand.slug, created!.id as string);
      result.brands.created++;
      result.aliasesAdded += brand.aliases.length;
      continue;
    }

    brandIds.set(brand.slug, found.id as string);
    result.brands.existing++;
    const known = new Set([found.name as string, ...(found.aliases as string[])]);
    const missing = brand.aliases.filter((alias) => !known.has(alias));
    if (missing.length > 0) {
      await db.query("update public.brands set aliases = aliases || $2::text[] where id = $1", [
        found.id,
        missing,
      ]);
      result.aliasesAdded += missing.length;
    }
  }

  // ── coffees ───────────────────────────────────────────────────────────────────────────
  const coffeeIds = new Map<string, string>();
  for (const coffee of plan.coffees) {
    const brandId = brandIds.get(coffee.brandSlug)!;
    const found = await one(
      `select id, name, form, capsule_system, brand_intensity, origin_country, is_blend
         from public.coffees where brand_id = $1 and slug = public.slugify($2)`,
      [brandId, coffee.name],
    );
    if (!found) {
      const created = await one(
        `insert into public.coffees
           (brand_id, name, form, capsule_system, brand_intensity, origin_country, is_blend, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [
          brandId,
          coffee.name,
          coffee.form,
          coffee.capsuleSystem,
          coffee.brandIntensity,
          coffee.originCountry,
          coffee.isBlend,
          ownerId,
        ],
      );
      coffeeIds.set(coffee.key, created!.id as string);
      result.coffees.created++;
      continue;
    }

    coffeeIds.set(coffee.key, found.id as string);
    result.coffees.existing++;
    for (const [field, column, title] of COFFEE_FIELDS) {
      if (coffee[field] !== null && coffee[field] !== found[column]) {
        result.findings.push({
          section: "conflict",
          line: null,
          message: `${found.name as string}: ${title} veritabanında ${String(found[column] ?? "boş")}, dosyada ${String(coffee[field])}. Veritabanı değiştirilmedi.`,
        });
      }
    }
  }

  // ── tastings ──────────────────────────────────────────────────────────────────────────
  for (const tasting of plan.tastings) {
    const coffeeId = coffeeIds.get(tasting.coffeeKey)!;
    const tally = tasting.status === "wishlist" ? result.wishlist : result.tastings;

    let brewMethodId: string | null = null;
    if (tasting.brewMethodSlug) {
      brewMethodId = methods.get(tasting.brewMethodSlug) ?? null;
      if (!brewMethodId) {
        throw new Error(
          `"${tasting.brewMethodSlug}" demleme yöntemi veritabanında yok. Migration'lar uygulandı mı?`,
        );
      }
    }

    if (tasting.status === "wishlist") {
      // A coffee can be on the wishlist only once, whoever put it there (import or website).
      const already = await one(
        "select 1 from public.tastings where user_id = $1 and coffee_id = $2 and status = 'wishlist'",
        [ownerId, coffeeId],
      );
      if (already) {
        tally.existing++;
        continue;
      }
    }

    const inserted = await one(
      `insert into public.tastings
         (user_id, coffee_id, brew_method_id, device, score, tasted_at, notes, status, visibility,
          source, source_ref)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'public', 'notion_import', $9)
       on conflict (user_id, source, source_ref) where source_ref is not null do nothing
       returning id`,
      [
        ownerId,
        coffeeId,
        brewMethodId,
        tasting.device,
        tasting.score,
        tasting.tastedAt,
        tasting.notes,
        tasting.status,
        tasting.sourceRef,
      ],
    );
    if (inserted) tally.created++;
    else tally.existing++;
  }

  return result;
}
