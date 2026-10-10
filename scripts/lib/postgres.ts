/**
 * Postgres helpers shared by scripts and tests: the migration list and an in-process
 * Postgres (PGlite) carrying the Supabase shim. No Docker, no cloud project.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import pg from "pg";

import { repoRoot } from "./target-env";

export type Row = Record<string, unknown>;

/** The one call scripts and tests need; both PGlite and node-postgres provide it. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
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

/**
 * Connects to a real Postgres. Supabase is always reached over TLS; its certificate is
 * signed by Supabase's own CA, which Node does not know, so the chain is not verified.
 */
export async function connectPostgres(dbUrl: string): Promise<pg.Client> {
  const { hostname } = new URL(dbUrl);
  const local = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}
