import { INVITE_REQUEST_STATUSES } from "@espressoir/core";
import { inviteRequestRowSchema } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;
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
  admin = await createUser(db, { username: "admin_test", role: "admin" });
});
afterEach(async () => {
  await db.rollback();
});

/** A request as the website sends it: the form's columns only. */
const ask = (as: string | null, email: string, note: string | null = null, consent = true) =>
  db
    .as(as)
    .sql("insert into public.invite_requests (email, note, consent) values ($1, $2, $3)", [
      email,
      note,
      consent,
    ]);

describe("invitation requests", () => {
  it("anyone may ask, signed in or not; the address is tidied and the request waits", async () => {
    await ask(null, "  Grace@Example.TEST ", "  Kahveyi   seviyorum. ");
    await ask(ada, "ada@example.test");

    const rows = await db
      .as(admin)
      .sql(
        "select id, email, note, status, created_at::text from public.invite_requests order by email",
      );
    const requests = rows.map((row) => inviteRequestRowSchema.parse(row));
    expect(requests.map((request) => request.email)).toEqual([
      "ada@example.test",
      "grace@example.test",
    ]);
    expect(requests[1]).toMatchObject({ note: "Kahveyi seviyorum.", status: "pending" });
  });

  it("nobody but an admin reads a request", async () => {
    await ask(null, "grace@example.test");
    await expect(db.as(null).sql("select * from public.invite_requests")).rejects.toThrow(
      /permission denied/,
    );
    expect(await db.as(ada).sql("select * from public.invite_requests")).toEqual([]);
    expect(await db.as(admin).sql("select id from public.invite_requests")).toHaveLength(1);
  });

  it("refuses a second request for an address, a bad address and a missing consent", async () => {
    await ask(null, "grace@example.test");
    await expect(ask(null, "GRACE@example.test")).rejects.toThrow(/one_per_email/);
    await expect(ask(null, "not-an-address")).rejects.toThrow(/email_format/);
    await expect(ask(null, "ada@example.test", null, false)).rejects.toThrow(/consent_given/);
  });

  it("a visitor cannot choose the status or the time", async () => {
    await expect(
      db
        .as(null)
        .sql(
          "insert into public.invite_requests (email, consent, status) values ('x@example.test', true, 'invited')",
        ),
    ).rejects.toThrow(/permission denied/);
  });

  it("only an admin marks a request as invited or dismissed, or deletes it", async () => {
    await ask(null, "grace@example.test");
    const [row] = await db.as(admin).sql<{ id: string }>("select id from public.invite_requests");

    expect(
      await db
        .as(ada)
        .sql("update public.invite_requests set status = 'invited' where id = $1 returning id", [
          row!.id,
        ]),
    ).toEqual([]);
    expect(
      await db
        .as(admin)
        .sql("update public.invite_requests set status = 'invited' where id = $1 returning id", [
          row!.id,
        ]),
    ).toHaveLength(1);
    await expect(
      db.as(admin).sql("update public.invite_requests set email = 'y@example.test'"),
    ).rejects.toThrow(/permission denied/);
    expect(await db.as(admin).sql("delete from public.invite_requests returning id")).toHaveLength(
      1,
    );
  });

  it("stops a flood: twenty requests in ten minutes, then no more", async () => {
    for (let i = 0; i < 20; i++) await ask(null, `kisi${i}@example.test`);
    await expect(ask(null, "bir-fazla@example.test")).rejects.toThrow(/rate_limited/);
  });

  it("the statuses match the TypeScript list", async () => {
    const [row] = await db.sql<{ def: string }>(
      `select pg_get_constraintdef(oid) as def from pg_constraint
       where conname = 'invite_requests_status_known'`,
    );
    expect([...row!.def.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort()).toEqual(
      [...INVITE_REQUEST_STATUSES].sort(),
    );
  });
});
