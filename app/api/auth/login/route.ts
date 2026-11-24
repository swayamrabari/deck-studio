import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { readJsonBody } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const WINDOW_MS = 15 * 60_000; // 15 minutes

export async function POST(request: Request) {
  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 }
    );
  }

  // Brute-force guard: per-email and per-IP fixed windows (per-instance,
  // in-memory). scrypt is deliberately expensive, so the caps are low.
  if (
    !rateLimit(`login:${email}`, 10, WINDOW_MS) ||
    !rateLimit(`login-ip:${clientIp(request)}`, 30, WINDOW_MS)
  ) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
