import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { deckMedia, decks } from "@/db/schema";
import { authorizeDeck } from "@/lib/decks";
import { sanitizeMediaName } from "@/lib/media";

/** Serves one media file of a deck. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/media/[name]">
) {
  const { id, name } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;
  const deck = auth.deck;

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

  // Media is auth-gated and private: `private` keeps intermediaries out,
  // `no-cache` + ETag lets the browser revalidate instead of re-downloading
  // the full body on every slide render and presentation view.
  const etag = createHash("sha256").update(row.bytes).digest("hex");
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, no-cache",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(row.bytes.byteLength),
    },
  });
}

/** Deletes one media file. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]/media/[name]">
) {
  const { id, name } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;
  const deck = auth.deck;

  const safeName = sanitizeMediaName(name);
  if (!safeName) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(deckMedia)
    .where(
      and(eq(deckMedia.deckId, deck.id), eq(deckMedia.name, safeName))
    );
  // Keep dashboard ordering consistent with uploads.
  await db
    .update(decks)
    .set({ updatedAt: new Date() })
    .where(eq(decks.id, deck.id));

  return NextResponse.json({ ok: true });
}
