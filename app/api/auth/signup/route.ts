import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, isUniqueViolation } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  hashPassword,
  signupsOpen,
  validateCredentials,
} from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const WINDOW_MS = 15 * 60_000; // 15 minutes

export async function POST(request: Request) {
  // Single-user mode: no new accounts unless explicitly enabled.
  if (!signupsOpen()) {
    return NextResponse.json(
      { error: "Registrations are closed on this instance." },
      { status: 403 }
    );
  }

  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const error = validateCredentials(email, password);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (
    !rateLimit(`signup:${email}`, 5, WINDOW_MS) ||
    !rateLimit(`signup-ip:${clientIp(request)}`, 15, WINDOW_MS)
  ) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  // The unique index on users.email is the real guarantee; the pre-check
  // only exists for a friendly error. Handle the race between the two.
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const id = randomUUID();
  try {
    await db
      .insert(users)
      .values({ id, email, passwordHash: await hashPassword(password) });
  } catch (insertError) {
    if (isUniqueViolation(insertError)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    throw insertError;
  }
  await createSession(id);

  return NextResponse.json({ user: { id, email } }, { status: 201 });
}
