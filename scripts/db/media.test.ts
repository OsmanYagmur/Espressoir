import { mediaPath } from "@espressoir/core";
import { parseArchive } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

// Storage's own table has triggers of its own on a real Supabase; the policy tests write
// to it as a member, which is only predictable on the in-process stand-in.
const onStandIn = process.env.TEST_DB_URL ? it.skip : it;

const FILE_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const FILE_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

let db: TestDb;
let ada: string;
let bob: string;
let admin: string;
let tasting: string;

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
  const [row] = await db.as(ada).sql<{ tasting_id: string }>(
    `select tasting_id from public.log_tasting_v1(
       p_brand_name => 'Foto Kavurucu', p_coffee_name => 'Deneme',
       p_score => 8::smallint, p_tasted_at => '2026-10-01')`,
  );
  tasting = row!.tasting_id;
});
afterEach(async () => {
  await db.rollback();
});

/** Puts a file's row into Storage the way an upload would (as the database owner). */
const stored = (path: string, size = 120_000) =>
  db.sql(
    "insert into storage.objects (bucket_id, name, metadata) values ('media', $1, $2::jsonb)",
    [path, JSON.stringify({ size })],
  );
/** The same, attempted as a member: this is what the bucket's rules decide. */
const upload = (user: string | null, path: string) =>
  db.as(user).sql("insert into storage.objects (bucket_id, name) values ('media', $1)", [path]);

const setPhoto = (
  user: string | null,
  path: string | null,
  on = tasting,
  alt: string | null = null,
) =>
  db
    .as(user)
    .sql<{ previous: string | null }>(
      "select public.set_tasting_photo_v1($1, $2, 1600, 1200, $3) as previous",
      [on, path, alt],
    );
const restrict = (user: string) =>
  db.sql(
    `insert into public.profile_private (profile_id, restricted_until)
     values ($1, now() + interval '1 day')
     on conflict (profile_id) do update set restricted_until = excluded.restricted_until`,
    [user],
  );

describe("the media bucket", () => {
  it("exists, public, small and for two formats only", async () => {
    const [bucket] = await db.sql(
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'media'",
    );
    expect(bucket).toEqual({
      public: true,
      file_size_limit: expect.anything(),
      allowed_mime_types: ["image/webp", "image/jpeg"],
    });
    expect(Number((bucket as { file_size_limit: unknown }).file_size_limit)).toBe(614_400);
  });

  onStandIn("lets a member write into their own folders only", async () => {
    await upload(ada, mediaPath("tastings", ada, FILE_A, "webp"));
    await upload(ada, mediaPath("avatars", ada, FILE_A, "jpg"));

    await expect(upload(ada, mediaPath("tastings", bob, FILE_A, "webp"))).rejects.toThrow(
      /row-level security/,
    );
    await expect(upload(ada, `baska/${ada}/${FILE_A}.webp`)).rejects.toThrow(/row-level security/);
    await expect(upload(ada, `${FILE_A}.webp`)).rejects.toThrow(/row-level security/);
    await expect(upload(null, mediaPath("tastings", ada, FILE_B, "webp"))).rejects.toThrow(
      /row-level security|permission denied/,
    );

    await restrict(ada);
    await expect(upload(ada, mediaPath("tastings", ada, FILE_B, "webp"))).rejects.toThrow(
      /row-level security/,
    );
  });

  onStandIn("lets a member remove their own files, and an admin anyone's", async () => {
    const mine = mediaPath("tastings", ada, FILE_A, "webp");
    const second = mediaPath("tastings", ada, FILE_B, "webp");
    await stored(mine);
    await stored(second);
    const names = async (user: string) =>
      (
        await db.as(user).sql<{ name: string }>("select name from storage.objects order by name")
      ).map((row) => row.name);

    // Bob neither sees nor removes Ada's rows; Ada does, restricted or not.
    expect(await names(bob)).toEqual([]);
    await db.as(bob).sql("delete from storage.objects where name = $1", [mine]);
    expect(await names(ada)).toEqual([mine, second]);
    await restrict(ada);
    await db.as(ada).sql("delete from storage.objects where name = $1", [mine]);
    expect(await names(ada)).toEqual([second]);
    await db.as(admin).sql("delete from storage.objects where name = $1", [second]);
    expect(await names(admin)).toEqual([]);
  });
});

describe("a tasting's picture", () => {
  it("is attached by its author, from their own folder, once the file is there", async () => {
    const path = mediaPath("tastings", ada, FILE_A, "webp");
    await expect(setPhoto(ada, path)).rejects.toThrow(/photo_not_found/);
    await stored(path);
    expect((await setPhoto(ada, path, tasting, "  Fincanda krema.  "))[0]!.previous).toBeNull();

    const [row] = await db.sql(
      "select photo_path, photo_width, photo_height, photo_alt from public.tasting_feed where tasting_id = $1",
      [tasting],
    );
    expect(row).toEqual({
      photo_path: path,
      photo_width: 1600,
      photo_height: 1200,
      photo_alt: "Fincanda krema.",
    });

    // Replacing hands back the old path, so its file can be removed.
    const next = mediaPath("tastings", ada, FILE_B, "jpg");
    await stored(next);
    expect((await setPhoto(ada, next))[0]!.previous).toBe(path);
    // Taking it away clears everything about it.
    expect((await setPhoto(ada, null))[0]!.previous).toBe(next);
    const [cleared] = await db.sql(
      "select photo_path, photo_alt from public.tastings where id = $1",
      [tasting],
    );
    expect(cleared).toEqual({ photo_path: null, photo_alt: null });
  });

  it("cannot be someone else's file, tasting or doing", async () => {
    const bobs = mediaPath("tastings", bob, FILE_A, "webp");
    const adas = mediaPath("tastings", ada, FILE_A, "webp");
    const avatar = mediaPath("avatars", ada, FILE_B, "webp");
    await stored(bobs);
    await stored(adas);
    await stored(avatar);

    await expect(setPhoto(ada, bobs)).rejects.toThrow(/photo_not_yours/);
    await expect(setPhoto(ada, avatar)).rejects.toThrow(/photo_not_yours/);
    await expect(setPhoto(bob, bobs)).rejects.toThrow(/tasting_not_found/);
    await expect(setPhoto(null, adas)).rejects.toThrow(/permission denied/);
    // The columns themselves are closed: a path cannot be written around the function.
    await expect(
      db.as(ada).sql("update public.tastings set photo_path = $1 where id = $2", [adas, tasting]),
    ).rejects.toThrow(/permission denied/);
  });

  it("is not for wishlist entries, and stays removable while restricted", async () => {
    const path = mediaPath("tastings", ada, FILE_A, "webp");
    await stored(path);
    const [wish] = await db.as(ada).sql<{ tasting_id: string }>(
      `select tasting_id from public.log_tasting_v1(
         p_brand_name => 'Foto Kavurucu', p_coffee_name => 'Sonra', p_status => 'wishlist')`,
    );
    await expect(setPhoto(ada, path, wish!.tasting_id)).rejects.toThrow(/wishlist_has_no_photo/);

    await setPhoto(ada, path);
    await restrict(ada);
    const other = mediaPath("tastings", ada, FILE_B, "webp");
    await stored(other);
    await expect(setPhoto(ada, other)).rejects.toThrow(/not_allowed/);
    expect((await setPhoto(ada, null))[0]!.previous).toBe(path);
  });

  it("is taken down by an admin, on the record", async () => {
    const path = mediaPath("tastings", ada, FILE_A, "webp");
    await stored(path);
    await setPhoto(ada, path);
    const remove = (user: string) =>
      db
        .as(user)
        .sql<{ previous: string | null }>(
          "select public.admin_remove_photo_v1('tasting', $1, 'uygunsuz') as previous",
          [tasting],
        );
    await expect(remove(bob)).rejects.toThrow(/not_allowed/);
    expect((await remove(admin))[0]!.previous).toBe(path);
    const [row] = await db.sql("select photo_path from public.tastings where id = $1", [tasting]);
    expect(row).toEqual({ photo_path: null });
    const log = await db.sql(
      "select action, target_type, note from public.moderation_log where target_id = $1",
      [tasting],
    );
    expect(log).toEqual([{ action: "remove_photo", target_type: "tasting", note: "uygunsuz" }]);
    await expect(
      db.as(admin).sql("select public.admin_remove_photo_v1('coffee', $1)", [tasting]),
    ).rejects.toThrow(/target_has_no_photo/);
  });
});

describe("a profile picture", () => {
  const setAvatar = (user: string | null, path: string | null) =>
    db
      .as(user)
      .sql<{ previous: string | null }>("select public.set_avatar_v1($1) as previous", [path]);

  it("is set from the member's own avatar folder and shows on their profile", async () => {
    const path = mediaPath("avatars", ada, FILE_A, "webp");
    await expect(setAvatar(ada, path)).rejects.toThrow(/photo_not_found/);
    await stored(path);
    expect((await setAvatar(ada, path))[0]!.previous).toBeNull();
    const [row] = await db
      .as(null)
      .sql("select avatar_path from public.profile_overview where user_id = $1", [ada]);
    expect(row).toEqual({ avatar_path: path });

    const bobs = mediaPath("avatars", bob, FILE_A, "webp");
    const tastingFile = mediaPath("tastings", ada, FILE_B, "webp");
    await stored(bobs);
    await stored(tastingFile);
    await expect(setAvatar(ada, bobs)).rejects.toThrow(/photo_not_yours/);
    await expect(setAvatar(ada, tastingFile)).rejects.toThrow(/photo_not_yours/);
    await expect(setAvatar(null, path)).rejects.toThrow(/permission denied/);

    await restrict(ada);
    expect((await setAvatar(ada, null))[0]!.previous).toBe(path);
    await expect(setAvatar(ada, path)).rejects.toThrow(/not_allowed/);
  });

  it("can no longer be an address anywhere on the web, and admins can take one down", async () => {
    await expect(
      db
        .as(ada)
        .sql("update public.profiles set avatar_url = 'https://example.com/x.png' where id = $1", [
          ada,
        ]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(ada).sql("update public.profiles set avatar_path = 'avatars/x' where id = $1", [ada]),
    ).rejects.toThrow(/permission denied/);

    const path = mediaPath("avatars", ada, FILE_A, "webp");
    await stored(path);
    await setAvatar(ada, path);
    const [removed] = await db
      .as(admin)
      .sql<{ previous: string }>("select public.admin_remove_photo_v1('profile', $1) as previous", [
        ada,
      ]);
    expect(removed!.previous).toBe(path);
  });
});

describe("pictures in reads", () => {
  it("reach the archive and the member's data export", async () => {
    const photo = mediaPath("tastings", ada, FILE_A, "webp");
    const avatar = mediaPath("avatars", ada, FILE_B, "jpg");
    await stored(photo);
    await stored(avatar);
    await setPhoto(ada, photo, tasting, "Fincan");
    await db.as(ada).sql("select public.set_avatar_v1($1)", [avatar]);

    const json = async (query: string) =>
      (
        await db
          .as(null)
          .sql<{ rows: unknown[] }>(
            `select coalesce(json_agg(r), '[]'::json) as rows from (${query}) as r`,
          )
      )[0]!.rows;
    const archive = parseArchive({
      coffees: await json("select * from public.coffee_overview"),
      tastings: await json("select * from public.tasting_feed"),
      brewMethods: await json("select * from public.brew_methods"),
      profiles: await json("select * from public.profile_overview"),
    });
    expect(archive.tastings.find((row) => row.id === tasting)?.photo).toEqual({
      path: photo,
      width: 1600,
      height: 1200,
      alt: "Fincan",
    });
    expect(archive.profiles.find((row) => row.id === ada)?.avatarPath).toBe(avatar);
    expect(archive.profiles.find((row) => row.id === bob)?.avatarPath).toBeNull();

    const [row] = await db
      .as(ada)
      .sql<{ doc: { photos: unknown } }>("select public.export_my_data_v2() as doc");
    expect(row!.doc.photos).toEqual({
      avatar,
      tastings: [{ tasting_id: tasting, path: photo, description: "Fincan" }],
    });
  });

  it("are counted for admins only", async () => {
    await stored(mediaPath("tastings", ada, FILE_A, "webp"), 100_000);
    await stored(mediaPath("avatars", bob, FILE_B, "webp"), 50_000);
    const [usage] = await db
      .as(admin)
      .sql<{ files: number; bytes: unknown }>("select * from public.media_usage_v1()");
    expect(usage!.files).toBe(2);
    expect(Number(usage!.bytes)).toBe(150_000);
    await expect(db.as(ada).sql("select * from public.media_usage_v1()")).rejects.toThrow(
      /not_allowed/,
    );
  });
});
