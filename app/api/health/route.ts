import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Liveness + database reachability. Vercel Cron hits this daily
 * (vercel.json) — the query is what keeps the Supabase project from
 * being paused as idle on the free tier. It also doubles as an uptime
 * endpoint: `ok: true` means the app AND the database are reachable.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: true });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
