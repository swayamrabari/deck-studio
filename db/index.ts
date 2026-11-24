import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Storage: Postgres (Supabase) via postgres.js.
 *
 * Supabase's transaction pooler (port 6543) multiplexes many serverless
 * instances over shared backend connections and does not support prepared
 * statements — hence `prepare: false` and a small per-instance pool.
 */

/** Ensures TLS without requiring the URL to carry it (Supabase enforces SSL). */
function withRequiredSsl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("sslmode")) return url;
    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      return url;
    }
    parsed.searchParams.set("sslmode", "require");
    return parsed.toString();
  } catch {
    return url;
  }
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase connection string to .env.local (see README — Deploy)."
    );
  }

  const client = postgres(withRequiredSsl(url), {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

type AppDatabase = ReturnType<typeof createDb>;

/**
 * True when the error (or drizzle's wrapped cause chain) is Postgres'
 * UNIQUE-constraint violation. drizzle rethrows driver errors with the
 * original in `cause`, so the chain must be walked.
 */
export function isUniqueViolation(error: unknown, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) return false;
  if ((error as { code?: unknown }).code === "23505") return true;
  return isUniqueViolation((error as { cause?: unknown }).cause, depth + 1);
}

// Lazy: the client opens on the first query, never during build-time
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
