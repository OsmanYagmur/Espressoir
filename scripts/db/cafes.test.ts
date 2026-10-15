import { CAFE_DRINKS, CAFES_PER_DAY, MAP_URL_PATTERN } from "@espressoir/core";
import { cafeRowSchema, cafeVisitRowSchema } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;
let bob: string;
let admin: string;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.begin();
  ada = await createUser(db, { username: "ada_test" });
  bob = await createUser(db, { username: "bob_test" });
  admin = await createUser(db, { username: "admin_test", role: "admin" });
});
afterEach(async () => {
  await db.rollback();
});

async function addCafe(
  user: string | null,
  name: string,
  cityCode = 34,
  extra: { district?: string | null; mapUrl?: string | null } = {},
): Promise<{ id: string; slug: string; reviewed_at: string | null }> {
  const [row] = await db.as(user).sql<{ id: string; slug: string; reviewed_at: string | null }>(
    `insert into public.cafes (name, city_code, district, map_url, created_by)
     values ($1, $2, $3, $4, $5) returning id, slug, reviewed_at`,
    [name, cityCode, extra.district ?? null, extra.mapUrl ?? null, user],
  );
  return row!;
}

async function visit(
  user: string,
  cafeId: string,
  fields: { score?: number; drink?: string; visibility?: string; notes?: string | null } = {},
): Promise<string> {
  const [row] = await db.as(user).sql<{ id: string }>(
    `insert into public.cafe_visits (user_id, cafe_id, drink, score, notes, visibility)
     values ($1, $2, $3, $4, $5, $6::public.tasting_visibility) returning id`,
    [
      user,
      cafeId,
      fields.drink ?? "flat_white",
      fields.score ?? 8,
      fields.notes ?? null,
      fields.visibility ?? "public",
    ],
  );
  return row!.id;
}

/** The café as the API would serve it to `as` (JSON, so dates arrive as text). */
const overview = async (as: string | null, cafeId: string) => {
  const [found] = await db.as(as).sql<{
    row: unknown;
  }>("select to_jsonb(o) as row from public.cafe_overview o where cafe_id = $1", [cafeId]);
  return found ? cafeRowSchema.parse(found.row) : undefined;
};

const visits = async (as: string | null, cafeId: string) =>
  (
    await db.as(as).sql<{
      row: unknown;
    }>("select to_jsonb(f) as row from public.cafe_visit_feed f where cafe_id = $1", [cafeId])
  ).map((found) => cafeVisitRowSchema.parse(found.row));

/** Rows made in one transaction share their timestamp: compare visits as sets. */
const ids = (rows: { id: string }[]) => rows.map((row) => row.id).sort();

describe("cafés", () => {
  it("get an address from their name, unique within the city, that survives a rename", async () => {
    const first = await addCafe(ada, "  Kadıköy   Kahve Evi ", 34, { district: "  Moda " });
    expect(first.slug).toBe("kadikoy-kahve-evi");
    expect((await addCafe(bob, "Kadıköy Kahve Evi", 34)).slug).toBe("kadikoy-kahve-evi-2");
    expect((await addCafe(bob, "Kadıköy Kahve Evi", 35)).slug).toBe("kadikoy-kahve-evi");
    expect((await addCafe(ada, "☕", 6)).slug).toBe("kafe");

    await db.as(admin).sql("update public.cafes set name = 'Moda Kahve' where id = $1", [first.id]);
    expect(await overview(null, first.id)).toMatchObject({
      name: "Moda Kahve",
      slug: "kadikoy-kahve-evi",
      district: "Moda",
      cityCode: 34,
      visitCount: 0,
      avgScore: null,
    });
  });

  it("are added unreviewed by members and reviewed by admins and scripts", async () => {
    expect((await addCafe(ada, "Üye Kafesi")).reviewed_at).toBeNull();
    expect((await addCafe(admin, "Yönetici Kafesi")).reviewed_at).not.toBeNull();
    // A script (no API user) runs as the database owner.
    const [script] = await db.sql<{ reviewed_at: string | null }>(
      "insert into public.cafes (name, city_code) values ('Betik Kafesi', 34) returning reviewed_at",
    );
    expect(script!.reviewed_at).not.toBeNull();
    // Whatever a member sends.
    const [sent] = await db.as(ada).sql<{ reviewed_at: string | null }>(
      `insert into public.cafes (name, city_code, created_by) values ('Kurnaz', 34, $1)
       returning reviewed_at`,
      [ada],
    );
    expect(sent!.reviewed_at).toBeNull();
  });

  it("are written within the rules: own name, allowed values, admins correct them", async () => {
    await expect(addCafe(ada, "   ")).rejects.toThrow(/cafes_name_length/);
    await expect(addCafe(ada, "x".repeat(81))).rejects.toThrow(/cafes_name_length/);
    await expect(addCafe(ada, "Şehirsiz", 82)).rejects.toThrow(/cafes_city_code_range/);
    await expect(
      db
        .as(bob)
        .sql("insert into public.cafes (name, city_code, created_by) values ('X', 34, $1)", [ada]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.as(null).sql("insert into public.cafes (name, city_code) values ('Ziyaretçi', 34)"),
    ).rejects.toThrow(/permission denied/);

    const cafe = await addCafe(ada, "Benim Kafem");
    await expect(
      db.as(ada).sql("update public.cafes set reviewed_at = now() where id = $1", [cafe.id]),
    ).rejects.toThrow(/permission denied/);
    // Updates and deletes by members simply match nothing.
    await db.as(ada).sql("update public.cafes set name = 'Değişti' where id = $1", [cafe.id]);
    await db.as(ada).sql("delete from public.cafes where id = $1", [cafe.id]);
    expect(await overview(null, cafe.id)).toMatchObject({ name: "Benim Kafem" });
  });

  it("take a map link only from a map service, the same rule as the app's", async () => {
    const urls = [
      "https://maps.app.goo.gl/AbC123",
      "https://www.google.com.tr/maps/place/Kahve",
      "https://www.openstreetmap.org/node/1",
      "https://google.evil.com/maps/x",
      "http://maps.app.goo.gl/AbC123",
      "https://example.com/?maps.apple.com",
    ];
    for (const [index, url] of urls.entries()) {
      const added = addCafe(ada, `Haritalı ${index}`, 34, { mapUrl: url });
      if (MAP_URL_PATTERN.test(url)) await added;
      else await expect(added).rejects.toThrow(/cafes_map_url_format/);
    }
  });

  it("are limited to a few new ones a day per member", async () => {
    for (let n = 1; n <= CAFES_PER_DAY; n += 1) await addCafe(ada, `Kafe ${n}`);
    await expect(addCafe(ada, "Bir fazlası")).rejects.toThrow(/rate_limited/);
    await addCafe(admin, "Yönetici sınırsız 1");
  });

  it("are found by a name that resembles what was typed, in a city if asked", async () => {
    await addCafe(ada, "Petra Roasting", 34, { district: "Gayrettepe" });
    await addCafe(ada, "Petra Kahve", 35);
    await addCafe(ada, "Başka Bir Yer", 34);
    const search = (query: string, city: number | null = null) =>
      db.as(null).sql<{
        cafe_name: string;
      }>("select cafe_name from public.search_cafes_v1($1, $2::smallint)", [query, city]);
    expect((await search("petra")).map((row) => row.cafe_name).sort()).toEqual([
      "Petra Kahve",
      "Petra Roasting",
    ]);
    expect(await search("petra", 34)).toEqual([{ cafe_name: "Petra Roasting" }]);
    expect((await search("PETRA roastıng"))[0]).toEqual({ cafe_name: "Petra Roasting" });
    expect(await search("gayrettepe")).toEqual([{ cafe_name: "Petra Roasting" }]);
    expect(await search("p")).toEqual([]);
  });
});

describe("café visits", () => {
  it("are logged in one call, reusing a café of the same name in the same city", async () => {
    const log = (user: string | null, args: Record<string, unknown>) =>
      db.as(user).sql<{ visit_id: string; cafe_id: string; city_code: number; cafe_slug: string }>(
        `select * from public.log_cafe_visit_v1(
           p_cafe_id => $1, p_cafe_name => $2, p_city_code => $3::smallint, p_district => $4,
           p_drink => $5, p_drink_name => $6, p_score => $7::smallint, p_notes => $8)`,
        [
          args.cafeId ?? null,
          args.name ?? null,
          args.city ?? null,
          args.district ?? null,
          args.drink ?? "espresso",
          args.drinkName ?? null,
          args.score ?? 8,
          args.notes ?? null,
        ],
      );

    const [first] = await log(ada, { name: "Yeni Dalga", city: 6, district: "Çankaya" });
    expect(first).toMatchObject({ city_code: 6, cafe_slug: "yeni-dalga" });
    // The same café, typed differently, in the same city.
    const [again] = await log(bob, { name: "  YENİ  dalga ", city: 6, drink: "latte" });
    expect(again!.cafe_id).toBe(first!.cafe_id);
    // Another city is another café.
    const [elsewhere] = await log(bob, { name: "Yeni Dalga", city: 7 });
    expect(elsewhere!.cafe_id).not.toBe(first!.cafe_id);
    // An existing café by id.
    const [byId] = await log(ada, { cafeId: first!.cafe_id, drinkName: "  Kenya  V60 " });
    expect(byId!.cafe_id).toBe(first!.cafe_id);

    expect((await visits(null, first!.cafe_id)).map((row) => row.drinkName).sort()).toEqual([
      "Kenya V60",
      null,
      null,
    ]);
    expect(await overview(null, first!.cafe_id)).toMatchObject({
      visitCount: 3,
      avgScore: 8,
      isReviewed: false,
      district: "Çankaya",
    });

    await expect(log(ada, { name: "Şehirsiz" })).rejects.toThrow(/cafe_required/);
    await expect(log(ada, { cafeId: first!.cafe_id, drink: "frappe" })).rejects.toThrow(
      /cafe_visits_drink_known/,
    );
    await expect(log(ada, { cafeId: first!.cafe_id, score: 11 })).rejects.toThrow(
      /cafe_visits_score_range/,
    );
    await expect(log(null, { cafeId: first!.cafe_id })).rejects.toThrow(/permission denied/);
  });

  it("are seen as tastings are: public by all, followers by followers, private by the author", async () => {
    const cafe = await addCafe(admin, "Görünürlük Kafesi");
    const open = await visit(ada, cafe.id, { score: 9, notes: "  Harika.  " });
    const friends = await visit(ada, cafe.id, { score: 3, visibility: "followers" });
    const mine = await visit(ada, cafe.id, { score: 1, visibility: "private" });

    expect((await visits(null, cafe.id)).map((row) => row.id)).toEqual([open]);
    expect((await visits(null, cafe.id))[0]).toMatchObject({
      notes: "Harika.",
      author: { username: "ada_test" },
      cafe: { name: "Görünürlük Kafesi", cityCode: 34 },
    });
    expect((await visits(bob, cafe.id)).map((row) => row.id)).toEqual([open]);
    await db
      .as(bob)
      .sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [bob, ada]);
    expect(ids(await visits(bob, cafe.id))).toEqual([open, friends].sort());
    expect(ids(await visits(ada, cafe.id))).toEqual([open, friends, mine].sort());
    // Only public visits count, whoever asks.
    expect(await overview(ada, cafe.id)).toMatchObject({ visitCount: 1, avgScore: 9 });
  });

  it("are written by their author only, in the columns that are theirs", async () => {
    const cafe = await addCafe(admin, "Yazma Kafesi");
    const other = await addCafe(admin, "Öteki Kafe");
    await expect(visit(bob, cafe.id).then(() => visit(ada, cafe.id))).resolves.toBeTruthy();
    await expect(
      db
        .as(bob)
        .sql(
          "insert into public.cafe_visits (user_id, cafe_id, drink, score) values ($1, $2, 'latte', 5)",
          [ada, cafe.id],
        ),
    ).rejects.toThrow(/row-level security/);

    const id = await visit(ada, cafe.id);
    await db
      .as(ada)
      .sql("update public.cafe_visits set score = 6, drink = 'cortado' where id = $1", [id]);
    for (const column of [`cafe_id = '${other.id}'`, `user_id = '${bob}'`, "hidden_at = now()"]) {
      await expect(
        db.as(ada).sql(`update public.cafe_visits set ${column} where id = $1`, [id]),
      ).rejects.toThrow(/permission denied/);
    }
    await db.as(bob).sql("update public.cafe_visits set score = 1 where id = $1", [id]);
    await db.as(bob).sql("delete from public.cafe_visits where id = $1", [id]);
    expect((await visits(null, cafe.id)).find((row) => row.id === id)).toMatchObject({
      score: 6,
      drink: "cortado",
    });

    // A restricted member can still delete, not add.
    await db.sql(
      `insert into public.profile_private (profile_id, restricted_until)
       values ($1, now() + interval '1 day')
       on conflict (profile_id) do update set restricted_until = excluded.restricted_until`,
      [ada],
    );
    await expect(visit(ada, cafe.id)).rejects.toThrow(/row-level security/);
    await db.as(ada).sql("delete from public.cafe_visits where id = $1", [id]);
    expect((await visits(null, cafe.id)).find((row) => row.id === id)).toBeUndefined();
  });

  it("are limited per day", async () => {
    const cafe = await addCafe(admin, "Sınır Kafesi");
    await db.sql(
      `insert into public.cafe_visits (user_id, cafe_id, drink, score)
       select $1, $2, 'espresso', 7 from generate_series(1, 29)`,
      [ada, cafe.id],
    );
    await visit(ada, cafe.id);
    await expect(visit(ada, cafe.id)).rejects.toThrow(/rate_limited/);
  });

  it("know the same drinks as the app", async () => {
    const [row] = await db.sql<{ def: string }>(
      "select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'cafe_visits_drink_known'",
    );
    const inDatabase = [...row!.def.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
    expect(inDatabase).toEqual([...CAFE_DRINKS].sort());
  });

  it("go with the member's account and into their data export", async () => {
    const cafe = await addCafe(ada, "İhracat Kafesi");
    await visit(ada, cafe.id, { score: 7, drink: "turkish" });
    const [row] = await db
      .as(ada)
      .sql<{ doc: { cafes_added: unknown[]; cafe_visits: unknown[] } }>(
        "select public.export_my_data_v2() as doc",
      );
    expect(row!.doc.cafes_added).toMatchObject([{ name: "İhracat Kafesi", city_code: 34 }]);
    expect(row!.doc.cafe_visits).toMatchObject([
      { cafe: "İhracat Kafesi", drink: "turkish", score: 7 },
    ]);

    await db.sql("delete from auth.users where id = $1", [ada]);
    expect(await visits(admin, cafe.id)).toEqual([]);
    // The café stays: other people may have been there too.
    expect(await overview(null, cafe.id)).toMatchObject({ name: "İhracat Kafesi" });
  });
});

describe("café moderation", () => {
  it("lets anyone signed in report a café or a visit that exists", async () => {
    const cafe = await addCafe(ada, "Şikâyet Kafesi");
    const id = await visit(ada, cafe.id);
    const report = (target: string, targetId: string) =>
      db
        .as(bob)
        .sql(
          "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, $2::public.report_target, $3, 'wrong_info')",
          [bob, target, targetId],
        );
    await report("cafe", cafe.id);
    await report("cafe_visit", id);
    await expect(report("cafe_visit", cafe.id)).rejects.toThrow(/report_target_not_found/);
  });

  it("lets admins hide and delete visits, and nobody else", async () => {
    const cafe = await addCafe(ada, "Moderasyon Kafesi");
    const id = await visit(ada, cafe.id, { score: 2 });
    const hide = (user: string, hidden: boolean) =>
      db
        .as(user)
        .sql("select public.admin_set_hidden_v1('cafe_visit', $1, $2, 'deneme')", [id, hidden]);

    await expect(hide(bob, true)).rejects.toThrow(/not_allowed/);
    await hide(admin, true);
    expect(await visits(null, cafe.id)).toEqual([]);
    expect(await visits(ada, cafe.id)).toMatchObject([{ id, isHidden: true }]);
    expect(await overview(null, cafe.id)).toMatchObject({ visitCount: 0 });
    await hide(admin, false);
    expect(await visits(null, cafe.id)).toMatchObject([{ id, isHidden: false }]);

    await db.as(admin).sql("select public.admin_delete_v1('cafe_visit', $1)", [id]);
    expect(await visits(admin, cafe.id)).toEqual([]);
    const log = await db.sql<{ action: string; target_type: string }>(
      "select action, target_type from public.moderation_log where target_id = $1 order by created_at",
      [id],
    );
    expect(log.map((entry) => entry.action)).toEqual(["hide", "unhide", "delete"]);
  });

  it("lets admins review cafés, delete an empty one and merge duplicates", async () => {
    const keep = await addCafe(ada, "Doğru Ad");
    const twin = await addCafe(bob, "Dogru Ad");
    const empty = await addCafe(bob, "Spam Kafe");
    await visit(ada, keep.id, { score: 6 });
    const moved = await visit(bob, twin.id, { score: 10 });
    await db
      .as(ada)
      .sql(
        "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'cafe', $2, 'other')",
        [ada, twin.id],
      );

    await expect(
      db.as(bob).sql("select public.admin_review_cafe_v1($1)", [keep.id]),
    ).rejects.toThrow(/not_allowed/);
    await db.as(admin).sql("select public.admin_review_cafe_v1($1)", [keep.id]);
    expect(await overview(null, keep.id)).toMatchObject({ isReviewed: true });

    await expect(
      db.as(admin).sql("select public.admin_delete_v1('cafe', $1)", [twin.id]),
    ).rejects.toThrow(/cafe_has_visits/);
    await db.as(admin).sql("select public.admin_delete_v1('cafe', $1)", [empty.id]);
    expect(await overview(null, empty.id)).toBeUndefined();

    await expect(
      db.as(admin).sql("select public.admin_merge_cafes_v1($1, $1)", [keep.id]),
    ).rejects.toThrow(/merge_same_target/);
    await db.as(admin).sql("select public.admin_merge_cafes_v1($1, $2)", [twin.id, keep.id]);
    expect(await overview(null, twin.id)).toBeUndefined();
    expect(await overview(null, keep.id)).toMatchObject({ visitCount: 2, avgScore: 8 });
    expect((await visits(null, keep.id)).map((row) => row.id)).toContain(moved);
    expect(await db.sql("select target_id from public.reports where target_type = 'cafe'")).toEqual(
      [{ target_id: keep.id }],
    );
  });
});
