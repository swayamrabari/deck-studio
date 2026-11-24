#!/usr/bin/env node
/**
 * One-off import: copies the local SQLite database (data/pptxgen.db) into
 * the Postgres database from DATABASE_URL (Supabase).
 *
 * - Safe to re-run: rows that already exist (by primary key / unique
 *   constraint) are skipped, never overwritten or duplicated.
 * - Sessions are intentionally NOT copied — sign in once after importing.
 * - Column names are identical between the v1 SQLite schema and the
 *   Postgres schema, so rows copy 1:1. Timestamps are converted from
 *   SQLite's epoch-seconds integers to timestamptz.
 *
 * Usage:  npm run db:import
 * (runs `node --env-file=.env.local scripts/migrate-sqlite-to-pg.mjs`)
 */

import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import postgres from "postgres";

const SQLITE_PATH = "data/pptxgen.db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set — add it to .env.local first.");
  process.exit(1);
}
if (!existsSync(SQLITE_PATH)) {
  console.log(`No local SQLite database at ${SQLITE_PATH} — nothing to import.`);
  process.exit(0);
}

// postgres.js accepts sslmode in the URL; Supabase enforces TLS.
let poolerUrl = url;
try {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
    poolerUrl = parsed.toString();
  }
} catch {
  // Use as-is.
}

const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
const sql = postgres(poolerUrl, { prepare: false, max: 3 });

/** SQLite epoch-seconds integer → Date for timestamptz. */
const toDate = (seconds) => new Date(seconds * 1000);

async function copyTable(table, select, insertRow) {
  const rows = sqlite.prepare(select).all();
  let inserted = 0;
  for (const row of rows) {
    try {
      const result = await insertRow(row);
      inserted += result.count;
    } catch (error) {
      console.error(`✗ ${table} ${row.id}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  const [pgCount] = await sql`SELECT count(*)::int AS n FROM ${sql(table)}`;
  console.log(
    `  ${table.padEnd(11)} sqlite=${String(rows.length).padStart(4)}  inserted=${String(inserted).padStart(4)}  postgres=${pgCount.n}`
  );
}

console.log("Importing SQLite → Postgres (existing rows are skipped)…\n");

try {
  await copyTable(
    "users",
    "SELECT id, email, password_hash, created_at FROM users",
    (r) => sql`
      INSERT INTO users (id, email, password_hash, created_at)
      VALUES (${r.id}, ${r.email}, ${r.password_hash}, ${toDate(r.created_at)})
      ON CONFLICT DO NOTHING
    `
  );

  await copyTable(
    "decks",
    "SELECT id, owner_id, title, created_at, updated_at FROM decks",
    (r) => sql`
      INSERT INTO decks (id, owner_id, title, created_at, updated_at)
      VALUES (${r.id}, ${r.owner_id}, ${r.title}, ${toDate(r.created_at)}, ${toDate(r.updated_at)})
      ON CONFLICT DO NOTHING
    `
  );

  await copyTable(
    "deck_files",
    "SELECT id, deck_id, path, content, updated_at FROM deck_files",
    (r) => sql`
      INSERT INTO deck_files (id, deck_id, path, content, updated_at)
      VALUES (${r.id}, ${r.deck_id}, ${r.path}, ${r.content}, ${toDate(r.updated_at)})
      ON CONFLICT DO NOTHING
    `
  );

  await copyTable(
    "deck_media",
    "SELECT id, deck_id, name, mime, bytes, size, created_at FROM deck_media",
    (r) => sql`
      INSERT INTO deck_media (id, deck_id, name, mime, bytes, size, created_at)
      VALUES (${r.id}, ${r.deck_id}, ${r.name}, ${r.mime}, ${Buffer.from(r.bytes)}, ${r.size}, ${toDate(r.created_at)})
      ON CONFLICT DO NOTHING
    `
  );

  console.log(
    "\nDone. Sessions were not copied — sign in once and you're set."
  );
} finally {
  sqlite.close();
  await sql.end();
}
