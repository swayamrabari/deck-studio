import "server-only";

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "./schema";

/**
 * v1 storage: SQLite via Node's built-in `node:sqlite` — zero native
 * dependencies. Drizzle's sqlite-proxy adapter provides the fully typed
 * query API over a DatabaseSync connection.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "pptxgen.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** Values `node:sqlite` can bind directly. */
type SQLValue = null | number | bigint | string | Uint8Array;

function toSqliteParam(value: unknown): SQLValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (value instanceof Uint8Array) return value;
  return String(value);
}

/** Applies pending drizzle-kit SQL migrations in filename order. */
function applyMigrations(sqlite: DatabaseSync): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = new Set(
    (
      sqlite.prepare("SELECT name FROM __migrations").all() as {
        name: string;
      }[]
    ).map((row) => row.name)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sqlText = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

    sqlite.exec("BEGIN");
    try {
      sqlite.exec(sqlText);
      sqlite
        .prepare("INSERT INTO __migrations (name, applied_at) VALUES (?, ?)")
        .run(file, Date.now());
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
}

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const sqlite = new DatabaseSync(DB_PATH);
  sqlite.exec("PRAGMA foreign_keys = ON");
  applyMigrations(sqlite);

  const statements = new Map<string, ReturnType<typeof sqlite.prepare>>();
  const prepare = (sqlText: string) => {
    let statement = statements.get(sqlText);
    if (!statement) {
      statement = sqlite.prepare(sqlText);
      statements.set(sqlText, statement);
    }
    return statement;
  };

  return drizzle(
    async (sqlText, params, method) => {
      const statement = prepare(sqlText);
      const bound: SQLValue[] = params.map(toSqliteParam);

      // drizzle's sqlite-proxy maps rows BY COLUMN POSITION
      // (row[columnIndex]), so rows must be value tuples — not objects.
      // Object.values is safe here: every query selects uniquely-named
      // columns, and node:sqlite keys rows in SELECT order.
      if (method === "run") {
        statement.run(...bound);
        return { rows: [] };
      }
      if (method === "get") {
        const row = statement.get(...bound);
        // NOTE: nothing in the app uses builder `.get()` queries (drizzle
        // maps an empty array here to an all-undefined row). Revisit before
        // ever relying on `.get()`.
        return row === undefined ? { rows: [] } : { rows: Object.values(row) };
      }
      const rows = statement.all(...bound) as Record<string, unknown>[];
      return { rows: rows.map((row) => Object.values(row)) };
    },
    { schema }
  );
}

type AppDatabase = ReturnType<typeof createDb>;

// Lazy: the connection opens on the first query, never during build-time
// page-data collection. Cached across dev HMR reloads.
const globalForDb = globalThis as unknown as { __pptxgenDb?: AppDatabase };

export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    const instance =
      globalForDb.__pptxgenDb ?? (globalForDb.__pptxgenDb = createDb());
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
