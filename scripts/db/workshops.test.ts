import {
  COMMUNITY_METRICS,
  WORKSHOP_APPLICATION_SOURCES,
  WORKSHOP_EXPERIENCES,
  WORKSHOP_RSVP_ANSWERS,
  WORKSHOP_STATUSES,
} from "@espressoir/core";
import { workshopApplicationRowSchema, workshopRowSchema } from "@espressoir/db";
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

/** A workshop a week from now (or as asked), added the way a script would. */
async function addWorkshop(
  fields: { capacity?: number; isOpen?: boolean; startsIn?: string } = {},
): Promise<string> {
  const [row] = await db.sql<{ id: string }>(
    `insert into public.workshops
       (title, program, starts_at, ends_at, capacity, price_text, location_text, is_open)
     values ('Deneme atölyesi', 'kahveye-giris', now() + $1::interval,
             now() + $1::interval + interval '2 hours', $2, 'Ücretsiz', 'Kadıköy', $3)
     returning id`,
    [fields.startsIn ?? "7 days", fields.capacity ?? 3, fields.isOpen ?? true],
  );
  return row!.id;
}

/** An application as the website sends it: the form's columns only. */
const apply = (as: string | null, workshopId: string, contact: string, consent = true) =>
  db.as(as).sql(
    `insert into public.workshop_applications
         (workshop_id, name, contact, experience, question, consent)
       values ($1, 'Ada Lovelace', $2, 'new', null, $3)`,
    [workshopId, contact, consent],
  );

/** A person added with a status, the way the admin panel does it (or a member trying to). */
const addWithStatus = (as: string, workshopId: string, contact: string, status: string) =>
  db.as(as).sql(
    `insert into public.workshop_applications
         (workshop_id, name, contact, experience, question, consent, status)
       values ($1, 'Grace Hopper', $2, 'regular', null, true, $3)`,
    [workshopId, contact, status],
  );

const overview = async (as: string | null, workshopId: string) => {
  const [found] = await db.as(as).sql<{
    row: unknown;
  }>("select to_jsonb(o) as row from public.workshop_overview o where workshop_id = $1", [workshopId]);
  return found ? workshopRowSchema.parse(found.row) : undefined;
};

/** Rows made in one transaction share their timestamp: listed by contact. */
const statuses = async (workshopId: string) =>
  Object.fromEntries(
    (
      await db.sql<{ contact: string; status: string }>(
        "select contact, status from public.workshop_applications where workshop_id = $1",
        [workshopId],
      )
    ).map((row) => [row.contact, row.status]),
  );

describe("workshops", () => {
  it("are public, with the seats left and nothing about the applicants", async () => {
    const id = await addWorkshop({ capacity: 3 });
    expect(await overview(null, id)).toMatchObject({ capacity: 3, seatsLeft: 3, isOpen: true });
    await apply(null, id, "0555 111 22 33");
    expect((await overview(null, id))?.seatsLeft).toBe(2);
    expect((await overview(ada, id))?.seatsLeft).toBe(2);
  });

  it("take applications from anyone, which nobody but an admin can read", async () => {
    const id = await addWorkshop();
    await apply(null, id, "@ada");
    await apply(ada, id, "0555 111 22 33");

    await expect(db.as(null).sql("select * from public.workshop_applications")).rejects.toThrow(
      /permission denied/,
    );
    expect(await db.as(ada).sql("select * from public.workshop_applications")).toEqual([]);

    const rows = await db.as(admin).sql<{
      row: unknown;
    }>("select to_jsonb(a) as row from public.workshop_applications a where workshop_id = $1", [id]);
    expect(rows.map(({ row }) => workshopApplicationRowSchema.parse(row))).toHaveLength(2);
  });

  it("let only an admin change a status, delete an application or edit a workshop", async () => {
    const id = await addWorkshop();
    await apply(null, id, "@ada");

    await expect(
      db.as(null).sql("update public.workshop_applications set status = 'approved'"),
    ).rejects.toThrow(/permission denied/);
    await db.as(ada).sql("update public.workshop_applications set status = 'approved'");
    expect(await statuses(id)).toEqual({ "@ada": "pending" });
    await db.as(ada).sql("update public.workshops set capacity = 50 where id = $1", [id]);
    expect((await overview(null, id))?.capacity).toBe(3);

    await db
      .as(admin)
      .sql("update public.workshop_applications set status = 'approved' where workshop_id = $1", [
        id,
      ]);
    expect(await statuses(id)).toEqual({ "@ada": "approved" });
    await db.as(admin).sql("update public.workshops set capacity = 10 where id = $1", [id]);
    expect((await overview(null, id))?.seatsLeft).toBe(9);

    await db.as(admin).sql("delete from public.workshop_applications where workshop_id = $1", [id]);
    expect(await statuses(id)).toEqual({});
  });

  it("decide the status themselves: what an applicant sends is not asked", async () => {
    const id = await addWorkshop();
    await expect(
      db.as(null).sql(
        `insert into public.workshop_applications
             (workshop_id, name, contact, experience, consent, status)
           values ($1, 'Ada', '@ada', 'new', true, 'approved')`,
        [id],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("keep a status sent with an application for an admin only, and mark the admin's", async () => {
    const id = await addWorkshop();
    await addWithStatus(ada, id, "@ada", "approved");
    await addWithStatus(admin, id, "@grace", "approved");
    expect(await statuses(id)).toEqual({ "@ada": "pending", "@grace": "approved" });
    expect(
      await db.sql(
        `select contact, source from public.workshop_applications
          where workshop_id = $1 order by contact`,
        [id],
      ),
    ).toEqual([
      { contact: "@ada", source: "form" },
      { contact: "@grace", source: "admin" },
    ]);
  });

  it("let an admin add a person to a closed, full or started workshop, once per contact", async () => {
    const closed = await addWorkshop({ isOpen: false, capacity: 1 });
    const started = await addWorkshop({ startsIn: "-1 hour" });
    await addWithStatus(admin, closed, "@grace", "approved");
    await addWithStatus(admin, closed, "@ada", "waitlist");
    await addWithStatus(admin, started, "@grace", "approved");
    expect(await statuses(closed)).toEqual({ "@ada": "waitlist", "@grace": "approved" });
    await expect(addWithStatus(admin, closed, "grace", "approved")).rejects.toThrow(
      /one_per_contact/,
    );
  });

  it("let only an admin mark who came", async () => {
    const id = await addWorkshop();
    await apply(null, id, "@ada");
    const attended = async () =>
      (
        await db.sql<{ attended: boolean | null }>(
          "select attended from public.workshop_applications where workshop_id = $1",
          [id],
        )
      )[0]?.attended;

    await expect(
      db.as(null).sql("update public.workshop_applications set attended = true"),
    ).rejects.toThrow(/permission denied/);
    await db.as(ada).sql("update public.workshop_applications set attended = true");
    expect(await attended()).toBeNull();

    await db
      .as(admin)
      .sql("update public.workshop_applications set attended = true where workshop_id = $1", [id]);
    expect(await attended()).toBe(true);
  });

  it("put applicants on the waitlist once the seats are taken; a rejection frees one", async () => {
    const id = await addWorkshop({ capacity: 2 });
    await apply(null, id, "@bir");
    await apply(null, id, "@iki");
    await apply(null, id, "@uc");
    expect(await statuses(id)).toEqual({ "@bir": "pending", "@iki": "pending", "@uc": "waitlist" });
    expect((await overview(null, id))?.seatsLeft).toBe(0);

    await db.sql(
      "update public.workshop_applications set status = 'rejected' where contact = '@bir'",
    );
    await db.sql(
      "update public.workshop_applications set status = 'rejected' where contact = '@iki'",
    );
    expect((await overview(null, id))?.seatsLeft).toBe(1);
    await apply(null, id, "@dort");
    expect((await statuses(id))["@dort"]).toBe("pending");
  });

  it("refuse applications to a closed or past workshop", async () => {
    const closed = await addWorkshop({ isOpen: false });
    await expect(apply(null, closed, "@ada")).rejects.toThrow(/workshop_closed/);
    const past = await addWorkshop({ startsIn: "-1 day" });
    await expect(apply(null, past, "@ada")).rejects.toThrow(/workshop_closed/);
  });

  it("take one application per phone number or handle, however it is written", async () => {
    const id = await addWorkshop({ capacity: 10 });
    await apply(null, id, "+90 555 111 22 33");
    await expect(apply(null, id, "0555 111 2233")).rejects.toThrow(/one_per_contact/);
    await apply(null, id, "@Ada.Lovelace");
    await expect(apply(null, id, "ada.lovelace")).rejects.toThrow(/one_per_contact/);
  });

  it("need the applicant's consent", async () => {
    const id = await addWorkshop();
    await expect(apply(null, id, "@ada", false)).rejects.toThrow(/consent_given/);
  });

  it("stop a flood: twenty applications in ten minutes per workshop", async () => {
    const id = await addWorkshop({ capacity: 100 });
    for (let index = 0; index < 20; index += 1) {
      await apply(null, id, `@kisi${index}`);
    }
    await expect(apply(null, id, "@bir.fazla")).rejects.toThrow(/rate_limited/);
  });

  it("know the same experiences and statuses as the app", async () => {
    const values = async (constraint: string) => {
      const [row] = await db.sql<{ def: string }>(
        "select pg_get_constraintdef(oid) as def from pg_constraint where conname = $1",
        [constraint],
      );
      return [...row!.def.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
    };
    expect(await values("workshop_applications_experience_known")).toEqual(
      [...WORKSHOP_EXPERIENCES].sort(),
    );
    expect(await values("workshop_applications_status_known")).toEqual(
      [...WORKSHOP_STATUSES].sort(),
    );
    expect(await values("workshop_applications_source_known")).toEqual(
      [...WORKSHOP_APPLICATION_SOURCES].sort(),
    );
    expect(await values("workshop_applications_rsvp_known")).toEqual(
      [...WORKSHOP_RSVP_ANSWERS].sort(),
    );
  });
});

describe("the answer page", () => {
  /** The token of the one application in a workshop, read the way the admin panel does. */
  const tokenOf = async (workshopId: string) => {
    const [row] = await db
      .as(admin)
      .sql<{ token: string }>(
        "select rsvp_token as token from public.workshop_applications where workshop_id = $1",
        [workshopId],
      );
    return row!.token;
  };
  const view = (as: string | null, token: string) =>
    db.as(as).sql<Record<string, unknown>>("select * from public.workshop_rsvp_v1($1)", [token]);
  const answer = (as: string | null, token: string, value: string) =>
    db.as(as).sql("select public.answer_workshop_rsvp_v1($1, $2)", [token, value]);

  it("gives every application its own unguessable token", async () => {
    const id = await addWorkshop({ capacity: 5 });
    await apply(null, id, "0555 111 22 33");
    await apply(null, id, "0555 111 22 44");
    const tokens = await db
      .as(admin)
      .sql<{ token: string }>(
        "select rsvp_token as token from public.workshop_applications where workshop_id = $1",
        [id],
      );
    expect(tokens).toHaveLength(2);
    for (const { token } of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(tokens[0]!.token).not.toBe(tokens[1]!.token);
  });

  it("shows a visitor the first name and the workshop, nothing private", async () => {
    const id = await addWorkshop();
    await apply(null, id, "0555 111 22 33");
    const token = await tokenOf(id);
    const [row] = await view(null, token);
    expect(row).toEqual({
      first_name: "Ada",
      workshop_title: "Deneme atölyesi",
      starts_at: expect.anything(),
      ends_at: expect.anything(),
      location_text: "Kadıköy",
      status: "pending",
      rsvp: null,
      can_answer: false,
    });
    expect(await view(null, "bilinmeyen-bir-anahtar-xx")).toEqual([]);
  });

  it("takes an answer from an approved person until the workshop starts", async () => {
    const id = await addWorkshop();
    await apply(null, id, "0555 111 22 33");
    const token = await tokenOf(id);

    await expect(answer(null, token, "yes")).rejects.toThrow(/rsvp_not_approved/);
    await db
      .as(admin)
      .sql("update public.workshop_applications set status = 'approved' where workshop_id = $1", [
        id,
      ]);
    await expect(answer(null, token, "belki")).rejects.toThrow(/rsvp_invalid/);
    await expect(answer(null, "bilinmeyen-bir-anahtar-xx", "yes")).rejects.toThrow(
      /rsvp_not_found/,
    );

    expect((await view(null, token))[0]?.can_answer).toBe(true);
    await answer(null, token, "yes");
    expect((await view(null, token))[0]?.rsvp).toBe("yes");
    // A change of mind wins until the start.
    await answer(ada, token, "no");
    const [row] = await db
      .as(admin)
      .sql<{ rsvp: string; answered: boolean }>(
        "select rsvp, rsvp_at is not null as answered from public.workshop_applications where workshop_id = $1",
        [id],
      );
    expect(row).toEqual({ rsvp: "no", answered: true });

    // Once it has started, the answer stays as it is.
    await db.sql(
      "update public.workshops set starts_at = now() - interval '5 minutes' where id = $1",
      [id],
    );
    await expect(answer(null, token, "yes")).rejects.toThrow(/rsvp_closed/);
    expect((await view(null, token))[0]?.can_answer).toBe(false);
  });

  it("lets nobody write the token or the answer directly; admins note when they asked", async () => {
    const id = await addWorkshop();
    await addWithStatus(admin, id, "0555 111 22 33", "approved");
    for (const column of ["rsvp = 'yes'", "rsvp_token = 'x'"]) {
      await expect(
        db.as(admin).sql(`update public.workshop_applications set ${column}`),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(
      db.as(null).sql("update public.workshop_applications set rsvp_asked_at = now()"),
    ).rejects.toThrow(/permission denied/);
    await db
      .as(admin)
      .sql(
        "update public.workshop_applications set rsvp_asked_at = now(), reminded_at = now() where workshop_id = $1",
        [id],
      );
    const [row] = await db.sql<{ asked: boolean; reminded: boolean }>(
      "select rsvp_asked_at is not null as asked, reminded_at is not null as reminded from public.workshop_applications where workshop_id = $1",
      [id],
    );
    expect(row).toEqual({ asked: true, reminded: true });
  });
});

describe("the community's numbers", () => {
  it("are counted for an admin only, in the order the app lists them", async () => {
    await expect(db.as(ada).sql("select * from public.admin_community_stats_v1()")).rejects.toThrow(
      /not_allowed/,
    );
    const rows = await db
      .as(admin)
      .sql<{ metric: string; total: number; last_week: number }>(
        "select * from public.admin_community_stats_v1()",
      );
    expect(rows.map(({ metric }) => metric)).toEqual([...COMMUNITY_METRICS]);
    // The two members made for this test joined just now.
    const members = rows.find(({ metric }) => metric === "members");
    expect(Number(members?.total)).toBeGreaterThanOrEqual(2);
    expect(Number(members?.last_week)).toBeGreaterThanOrEqual(2);
  });
});
