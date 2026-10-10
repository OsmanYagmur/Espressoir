/**
 * Database for tests. By default an in-process Postgres (PGlite) with the Supabase shim and
 * every migration applied: no Docker, no cloud project, a fresh database per test file.
 * With TEST_DB_URL set (CI), the same tests run against a real Supabase Postgres whose
 * migrations are already applied.
 *
 * Each test runs inside a transaction that is rolled back, so tests never see each other.
 */
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import pg from "pg";

import { repoRoot } from "./target-env";

export type Row = Record<string, unknown>;

/** The two calls the importer and the tests need; both PGlite and node-postgres provide them. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

interface Driver extends Queryable {
  exec(text: string): Promise<unknown>;
  close(): Promise<void>;
}

/** Runs statements as one API role, the way PostgREST does for a request. */
export interface Session {
  sql<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface TestDb extends Queryable {
  /** True for the in-process database; false when running against TEST_DB_URL. */
  readonly embedded: boolean;
  /** Runs as the database owner, bypassing RLS (what migrations and scripts do). */
  sql<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
  /** A signed-in user (`authenticated` role) or, with null, an anonymous visitor (`anon`). */
  as(userId: string | null): Session;
  begin(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

const MIGRATIONS_DIR = resolve(repoRoot, "supabase/migrations");
const ROLLBACKS_DIR = resolve(repoRoot, "supabase/rollbacks");
const SHIM_FILE = resolve(repoRoot, "supabase/tests/local-shim.sql");

export function listMigrations(): { name: string; up: string; down: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => {
      const name = file.replace(/\.sql$/, "");
      return {
        name,
        up: readFileSync(resolve(MIGRATIONS_DIR, file), "utf8"),
        down: readFileSync(resolve(ROLLBACKS_DIR, `${name}.down.sql`), "utf8"),
      };
    });
}

/** A bare PGlite with the Supabase shim, before any migration. */
export async function createEmbeddedPostgres(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pg_trgm, unaccent } });
  await db.exec(readFileSync(SHIM_FILE, "utf8"));
  return db;
}

export async function applyMigrations(db: { exec(text: string): Promise<unknown> }): Promise<void> {
  for (const migration of listMigrations()) {
    try {
      await db.exec(migration.up);
    } catch (error) {
      throw new Error(`Migration ${migration.name} failed: ${(error as Error).message}`, {
        cause: error,
      });
    }
  }
}

async function createDriver(): Promise<{ driver: Driver; embedded: boolean }> {
  const url = process.env.TEST_DB_URL;
  if (url) {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    return {
      embedded: false,
      driver: {
        query: (text, params) => client.query(text, params),
        exec: (text) => client.query(text),
        close: () => client.end(),
      },
    };
  }

  const db = await createEmbeddedPostgres();
  await applyMigrations(db);
  return {
    embedded: true,
    driver: {
      query: (text, params) => db.query<Row>(text, params),
      exec: (text) => db.exec(text),
      close: () => db.close(),
    },
  };
}

export async function createTestDb(): Promise<TestDb> {
  const { driver, embedded } = await createDriver();

  let inTransaction = false;

  // Inside a test transaction every statement gets a savepoint, so a statement that is
  // expected to fail does not abort the statements after it.
  const guarded = async <T>(run: () => Promise<T>): Promise<T> => {
    if (!inTransaction) return run();
    await driver.exec("savepoint guarded");
    try {
      const result = await run();
      await driver.exec("release savepoint guarded");
      return result;
    } catch (error) {
      await driver.exec("rollback to savepoint guarded");
      await driver.exec("release savepoint guarded");
      throw error;
    }
  };

  const sql = <T extends Row>(text: string, params?: unknown[]): Promise<T[]> =>
    guarded(async () => (await driver.query(text, params)).rows as T[]);

  return {
    embedded,
    query: (text, params) => guarded(() => driver.query(text, params)),
    sql,
    exec: (text) =>
      guarded(async () => {
        await driver.exec(text);
      }),
    as(userId) {
      const role = userId ? "authenticated" : "anon";
      const claims = JSON.stringify(userId ? { sub: userId, role } : { role });
      return {
        // Rolling back to the savepoint on failure also undoes the role switch.
        sql<T extends Row>(text: string, params?: unknown[]): Promise<T[]> {
          if (!inTransaction) throw new Error("as() needs a transaction: call begin() first.");
          return guarded(async () => {
            await driver.exec(`set local role ${role}`);
            await driver.query("select set_config('request.jwt.claims', $1, true)", [claims]);
            const result = await driver.query(text, params);
            await driver.exec("reset role");
            await driver.query("select set_config('request.jwt.claims', '', true)");
            return result.rows as T[];
          });
        },
      };
    },
    begin: async () => {
      await driver.exec("begin");
      inTransaction = true;
    },
    rollback: async () => {
      inTransaction = false;
      await driver.exec("rollback");
    },
    close: () => driver.close(),
  };
}

/** Creates an auth user the way Supabase Auth would; the trigger adds the profile. */
export async function createUser(
  db: TestDb,
  options: { username: string; role?: "user" | "admin" },
): Promise<string> {
  const id = randomUUID();
  await db.sql("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    `${options.username}-${id.slice(0, 8)}@example.test`,
    JSON.stringify({ username: options.username }),
  ]);
  if (options.role === "admin") {
    await db.sql("update public.profiles set role = 'admin' where id = $1", [id]);
  }
  return id;
}
