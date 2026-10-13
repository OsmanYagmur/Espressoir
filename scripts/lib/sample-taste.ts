import type { Queryable } from "./postgres";

/**
 * Taste profiles and flavour tags for some tastings of the sample export, so previews and
 * tests have something to draw. A Notion export has no such columns. This is sample data:
 * callers apply it only when the file being imported is the fixture, never to anyone's
 * own archive.
 *
 * Between them the entries cover what the pages must handle: a full profile, one with a
 * corner missing, one with too few corners for a chart, and tastings without any.
 */
const SAMPLE_TASTE: readonly {
  coffee: string;
  /** body, acidity, bitterness, sweetness, aftertaste */
  profile: readonly [number | null, number | null, number | null, number | null, number | null];
  tags: readonly string[];
}[] = [
  {
    coffee: "Ristretto (Siyah Kapsül)",
    profile: [5, 2, 4, 2, 4],
    tags: ["bitter-cikolata", "kakao", "tutsulu"],
  },
  { coffee: "Colombia", profile: [3, 4, 2, 3, 3], tags: ["meyvemsi", "narenciye", "karamel"] },
  {
    coffee: "İstanbul Espresso",
    profile: [4, 2, 4, null, 3],
    tags: ["bitter-cikolata", "baharatli"],
  },
  {
    coffee: "Explore Colombia",
    profile: [4, 2, 3, 3, 4],
    tags: ["sutlu-cikolata", "findik", "karamel"],
  },
  {
    coffee: "Spring Season Blend",
    profile: [2, 4, 1, 3, 3],
    tags: ["meyvemsi", "ciceksi", "yasemin"],
  },
  { coffee: "Wilder Jungle", profile: [2, 4, null, null, 3], tags: ["ciceksi"] },
  { coffee: "Original Taste", profile: [3, null, null, null, null], tags: [] },
];

/** Idempotent: running it again changes nothing. */
export async function applySampleTaste(db: Queryable): Promise<void> {
  for (const { coffee, profile, tags } of SAMPLE_TASTE) {
    await db.query(
      `update public.tastings t
          set body = $2, acidity = $3, bitterness = $4, sweetness = $5, aftertaste = $6
         from public.coffees c
        where c.id = t.coffee_id and c.name = $1
          and t.source = 'notion_import' and t.status = 'logged'`,
      [coffee, ...profile],
    );
    await db.query(
      `insert into public.tasting_flavor_tags (tasting_id, flavor_tag_id)
       select t.id, f.id
         from public.tastings t
         join public.coffees c on c.id = t.coffee_id
         join public.flavor_tags f on f.slug = any ($2::text[])
        where c.name = $1 and t.source = 'notion_import' and t.status = 'logged'
           on conflict do nothing`,
      [coffee, tags],
    );
  }
}
