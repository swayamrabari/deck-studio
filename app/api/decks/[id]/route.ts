import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { decks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/** Deletes a deck owned by the signed-in user (files cascade via FK). */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const [deck] = await db
    .select({ id: decks.id, ownerId: decks.ownerId })
    .from(decks)
    .where(eq(decks.id, id))
    .limit(1);

  if (!deck || deck.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(decks).where(eq(decks.id, id));
  return NextResponse.json({ ok: true });
}
