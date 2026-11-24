import "server-only";

import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, lt } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

/**
 * v1 auth: custom, token-based, deliberately minimal.
 * Email + password (scrypt-hashed) → opaque session token in an httpOnly
 * cookie; only the sha256 of the token is stored server-side.
 * Upgrade path (documented, not built): Better Auth / OAuth.
 */

const SESSION_COOKIE = "pptxgen_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PASSWORD_MAX_LENGTH = 128;

/**
 * Single-user deployment: registrations are closed unless explicitly
 * re-opened with ALLOW_SIGNUPS=1 (or "true") in the environment. Existing
 * accounts keep signing in normally.
 */
export function signupsOpen(): boolean {
  const raw = process.env.ALLOW_SIGNUPS?.toLowerCase();
  return raw === "1" || raw === "true";
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

/** Returns an error message, or null when the credentials are valid. */
export function validateCredentials(
  email: unknown,
  password: unknown
): string | null {
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "Enter a valid email address.";
  }
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  // Opportunistic GC: expired sessions are never read again, so piggyback
  // their removal on session creation (the table otherwise grows forever).
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null. Safe in any server context. Wrapped in
 * React `cache()` so repeated calls within one request (page + API
 * handlers, nested components) share a single session lookup.
 */
export const getCurrentUser = cache(
  async (): Promise<User | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, hashToken(token)),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return rows[0]?.user ?? null;
  }
);

/**
 * Page-context auth guard: marks the render as request-time (Cache
 * Components excludes everything after from the static shell), then reads
 * the session. Route handlers use `getCurrentUser` directly — they are
 * request-time by nature.
 */
export async function requireUser(): Promise<User | null> {
  await connection();
  return getCurrentUser();
}
