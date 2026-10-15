import { brandPageRowSchema, cafeRowSchema, profileRowSchema } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;
let bob: string;
let admin: string;
let brand: string;
let otherBrand: string;
let coffee: string;
let otherCoffee: string;
let cafe: string;

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
  [brand, otherBrand] = (
    await db.sql<{ id: string }>(
      "insert into public.brands (name) values ('Ada Kavurucu'), ('Başka Marka') returning id",
    )
  ).map((row) => row.id) as [string, string];
  [coffee, otherCoffee] = (
    await db.sql<{ id: string }>(
      "insert into public.coffees (brand_id, name) values ($1, 'Ev Harmanı'), ($2, 'Rakip') returning id",
      [brand, otherBrand],
    )
  ).map((row) => row.id) as [string, string];
  [{ id: cafe }] = (await db.sql<{ id: string }>(
    "insert into public.cafes (name, city_code) values ('Ada Kafe', 34) returning id",
  )) as [{ id: string }];
});
afterEach(async () => {
  await db.rollback();
});

const apply = (
  user: string,
  target: { brand?: string; cafe?: string },
  message = "Kavurucunun kurucusuyum.",
  website: string | null = null,
) =>
  db.as(user).sql<{ id: string }>(
    `insert into public.verification_requests (profile_id, brand_id, cafe_id, message, website)
     values ($1, $2, $3, $4, $5) returning id`,
    [user, target.brand ?? null, target.cafe ?? null, message, website],
  );

const resolve = (user: string, requestId: string, approve: boolean, note: string | null = null) =>
  db
    .as(user)
    .sql("select public.admin_resolve_verification_v1($1, $2, $3)", [requestId, approve, note]);

async function makeOfficial(user: string, target: { brand?: string; cafe?: string }) {
  const [request] = await apply(user, target);
  await resolve(admin, request!.id, true);
  return request!.id;
}

const brandPage = async (brandId: string) => {
  const [row] = await db
    .as(null)
    .sql<{ row: unknown }>(
      "select to_jsonb(b) as row from public.brand_pages b where brand_id = $1",
      [brandId],
    );
  return brandPageRowSchema.parse(row!.row);
};

const profile = async (userId: string) => {
  const [row] = await db
    .as(null)
    .sql<{ row: unknown }>(
      "select to_jsonb(p) as row from public.profile_overview p where user_id = $1",
      [userId],
    );
  return profileRowSchema.parse(row!.row);
};

describe("applying to speak for a business", () => {
  it("is a member's own, one open application per business, a few a day", async () => {
    const [request] = await apply(ada, { brand }, "  Sahibiyim.  ", "https://ada.example");
    expect(
      await db.sql(
        "select message, website, status from public.verification_requests where id = $1",
        [request!.id],
      ),
    ).toEqual([{ message: "Sahibiyim.", website: "https://ada.example", status: "open" }]);

    await expect(apply(ada, { brand })).rejects.toThrow(/verification_requests_open_brand/);
    await expect(
      db
        .as(bob)
        .sql(
          "insert into public.verification_requests (profile_id, brand_id, message) values ($1, $2, 'x')",
          [ada, otherBrand],
        ),
    ).rejects.toThrow(/row-level security/);
    await expect(apply(bob, { brand, cafe })).rejects.toThrow(/one_business/);
    await expect(apply(bob, { brand }, "   ")).rejects.toThrow(/null value|message/);
    await expect(apply(bob, { brand }, "x", "http://bob.example")).rejects.toThrow(
      /website_format/,
    );
    await expect(
      db.as(ada).sql("update public.verification_requests set status = 'approved'"),
    ).rejects.toThrow(/permission denied/);

    await apply(ada, { brand: otherBrand });
    await apply(ada, { cafe });
    const [extra] = await db.sql<{ id: string }>(
      "insert into public.brands (name) values ('Dördüncü') returning id",
    );
    await expect(apply(ada, { brand: extra!.id })).rejects.toThrow(/rate_limited/);
  });

  it("is read by the applicant and admins, and can be withdrawn while open", async () => {
    const [request] = await apply(ada, { brand });
    const read = (user: string) => db.as(user).sql("select id from public.verification_requests");
    expect(await read(ada)).toHaveLength(1);
    expect(await read(bob)).toEqual([]);
    expect(await read(admin)).toHaveLength(1);
    await expect(db.as(null).sql("select id from public.verification_requests")).rejects.toThrow(
      /permission denied/,
    );

    await db.as(bob).sql("delete from public.verification_requests where id = $1", [request!.id]);
    expect(await read(ada)).toHaveLength(1);
    await db.as(ada).sql("delete from public.verification_requests where id = $1", [request!.id]);
    expect(await read(ada)).toEqual([]);
  });

  it("is not open to restricted members", async () => {
    await db.sql(
      `insert into public.profile_private (profile_id, restricted_until)
       values ($1, now() + interval '1 day')
       on conflict (profile_id) do update set restricted_until = excluded.restricted_until`,
      [ada],
    );
    await expect(apply(ada, { brand })).rejects.toThrow(/row-level security/);
  });
});

describe("an admin's answer", () => {
  it("makes the applicant the business's official account, and tells them", async () => {
    const [request] = await apply(ada, { brand });
    await expect(resolve(bob, request!.id, true)).rejects.toThrow(/not_allowed/);
    await resolve(admin, request!.id, true, "Web sitesinden doğrulandı.");

    expect(await brandPage(brand)).toMatchObject({
      name: "Ada Kavurucu",
      official: { username: "ada_test" },
    });
    expect((await profile(ada)).officialFor).toEqual([
      { kind: "brand", id: brand, slug: "ada-kavurucu", name: "Ada Kavurucu", cityCode: null },
    ]);
    expect(
      await db
        .as(ada)
        .sql(
          "select type, actor_username, request_status, business_name from public.notification_feed",
        ),
    ).toEqual([
      {
        type: "verification",
        actor_username: "admin_test",
        request_status: "approved",
        business_name: "Ada Kavurucu",
      },
    ]);
    expect(
      await db.sql("select action, target_type from public.moderation_log where target_id = $1", [
        request!.id,
      ]),
    ).toEqual([{ action: "verification_approved", target_type: "verification" }]);

    // Answered once; the business has its account, so nobody else can apply or be approved.
    await expect(resolve(admin, request!.id, false)).rejects.toThrow(/request_not_open/);
    await expect(apply(bob, { brand })).rejects.toThrow(/already_official/);
  });

  it("can be a no, which the applicant hears too", async () => {
    const [request] = await apply(ada, { cafe });
    await resolve(admin, request!.id, false, "Kanıt yok.");
    expect(await db.as(ada).sql("select status, note from public.verification_requests")).toEqual([
      { status: "rejected", note: "Kanıt yok." },
    ]);
    expect(
      await db.as(ada).sql("select request_status, business_name from public.notification_feed"),
    ).toEqual([{ request_status: "rejected", business_name: "Ada Kafe" }]);
    expect((await profile(ada)).officialFor).toEqual([]);
  });

  it("refuses a second official account for a business", async () => {
    const [first] = await apply(ada, { brand });
    const [second] = await apply(bob, { brand });
    await resolve(admin, first!.id, true);
    await expect(resolve(admin, second!.id, true)).rejects.toThrow(/already_official/);
  });

  it("can be taken back", async () => {
    await makeOfficial(ada, { brand });
    const [official] = await db.sql<{ id: string }>(
      "select id from public.official_accounts where profile_id = $1",
      [ada],
    );
    await expect(
      db.as(bob).sql("select public.admin_revoke_official_v1($1)", [official!.id]),
    ).rejects.toThrow(/not_allowed/);
    await db.as(admin).sql("select public.admin_revoke_official_v1($1, 'Ayrıldı')", [official!.id]);
    expect(await brandPage(brand)).toMatchObject({ official: null });
    await expect(
      db
        .as(ada)
        .sql("insert into public.official_accounts (profile_id, brand_id) values ($1, $2)", [
          ada,
          brand,
        ]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("an official account", () => {
  it("edits its business's description and links, nothing else", async () => {
    await makeOfficial(ada, { brand });
    const edit = (user: string, description: string | null, website: string | null) =>
      db
        .as(user)
        .sql(
          "select public.update_business_page_v1(p_brand_id => $1, p_description => $2, p_website => $3)",
          [brand, description, website],
        );

    await edit(ada, "  Küçük partiler halinde kavuruyoruz.  ", "https://ada.example");
    expect(await brandPage(brand)).toMatchObject({
      name: "Ada Kavurucu",
      description: "Küçük partiler halinde kavuruyoruz.",
      website: "https://ada.example",
    });
    await expect(edit(bob, "Ele geçirildi", null)).rejects.toThrow(/not_allowed/);
    await expect(edit(ada, "x".repeat(1001), null)).rejects.toThrow(/brands_description_length/);
    await edit(admin, "", "");
    expect(await brandPage(brand)).toMatchObject({ description: null, website: null });
    await expect(
      db
        .as(ada)
        .sql("select public.update_business_page_v1(p_brand_id => $1, p_cafe_id => $2)", [
          otherBrand,
          null,
        ]),
    ).rejects.toThrow(/not_allowed/);
  });

  it("edits a café's district and map link too", async () => {
    await makeOfficial(bob, { cafe });
    await db.as(bob).sql(
      `select public.update_business_page_v1(p_cafe_id => $1, p_description => 'Moda''da bir köşe.',
           p_website => 'https://kafe.example', p_district => '  Moda ', p_map_url => 'https://maps.app.goo.gl/x1')`,
      [cafe],
    );
    const [row] = await db
      .as(null)
      .sql<{ row: unknown }>(
        "select to_jsonb(c) as row from public.cafe_overview c where cafe_id = $1",
        [cafe],
      );
    expect(cafeRowSchema.parse(row!.row)).toMatchObject({
      name: "Ada Kafe",
      district: "Moda",
      mapUrl: "https://maps.app.goo.gl/x1",
      description: "Moda'da bir köşe.",
      website: "https://kafe.example",
      officialUsername: "bob_test",
    });
  });

  it("does not score its own coffees or café, and may still write about them", async () => {
    await makeOfficial(ada, { brand });
    await makeOfficial(ada, { cafe });
    const tasting = (coffeeId: string, score: number | null) =>
      db
        .as(ada)
        .sql(
          "insert into public.tastings (user_id, coffee_id, score, notes) values ($1, $2, $3, 'Not')",
          [ada, coffeeId, score],
        );
    await expect(tasting(coffee, 9)).rejects.toThrow(/official_cannot_score/);
    await tasting(coffee, null);
    await tasting(otherCoffee, 6);
    await expect(
      db
        .as(ada)
        .sql("update public.tastings set score = 10 where coffee_id = $1 and user_id = $2", [
          coffee,
          ada,
        ]),
    ).rejects.toThrow(/official_cannot_score/);
    await expect(
      db
        .as(ada)
        .sql(
          "insert into public.cafe_visits (user_id, cafe_id, drink, score) values ($1, $2, 'espresso', 9)",
          [ada, cafe],
        ),
    ).rejects.toThrow(/official_cannot_score/);
  });

  it("is in the member's data export, with their applications", async () => {
    await makeOfficial(ada, { brand });
    await apply(ada, { cafe }, "Kafenin de sahibiyim.");
    const [row] = await db.as(ada).sql<{
      doc: { official_for: unknown[]; verification_requests: unknown[] };
    }>("select public.export_my_data_v2() as doc");
    expect(row!.doc.official_for).toMatchObject([{ kind: "brand", name: "Ada Kavurucu" }]);
    expect(row!.doc.verification_requests).toMatchObject([
      { business: "Ada Kavurucu", status: "approved" },
      { business: "Ada Kafe", status: "open", message: "Kafenin de sahibiyim." },
    ]);
  });
});
