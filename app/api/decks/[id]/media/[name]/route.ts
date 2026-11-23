import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { deckMedia } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/decks";
import { sanitizeMediaName } from "@/lib/media";

/** Serves one media file of a deck. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]/media/[name]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await ctx.params;
  const deck = await getOwnedDeck(id, user.id);
  if (!deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const safeName = sanitizeMediaName(name);
  if (!safeName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select({ mime: deckMedia.mime, bytes: deckMedia.bytes })
    .from(deckMedia)
    .where(
      and(eq(deckMedia.deckId, deck.id), eq(deckMedia.name, safeName))
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "no-store",
      "Content-Length": String(row.bytes.byteLength),
    },
  });
}

/** Deletes one media file. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]/media/[name]">
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await ctx.params;
  const deck = await getOwnedDeck(id, user.id);
  if (!deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const safeName = sanitizeMediaName(name);
  if (!safeName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(deckMedia)
    .where(
      and(eq(deckMedia.deckId, deck.id), eq(deckMedia.name, safeName))
    );

  return NextResponse.json({ ok: true });
}
