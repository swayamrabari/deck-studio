import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { deckMedia, decks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/decks";
import { MAX_MEDIA_BYTES, sanitizeMediaName } from "@/lib/media";

async function requireDeck(ctx: RouteContext<"/api/decks/[id]/media">) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { id } = await ctx.params;
  const deck = await getOwnedDeck(id, user.id);
  if (!deck) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { deck };
}

/** Lists a deck's media (metadata only). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]/media">
) {
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

  const items = await db
    .select({
      name: deckMedia.name,
      mime: deckMedia.mime,
      size: deckMedia.size,
      createdAt: deckMedia.createdAt,
    })
    .from(deckMedia)
    .where(eq(deckMedia.deckId, auth.deck.id))
    .orderBy(asc(deckMedia.name));

  return NextResponse.json({ media: items });
}

/** Uploads an image (form field `file`); same name replaces the old file. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/media">
) {
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image uploads are supported." },
      { status: 415 }
    );
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return NextResponse.json(
      { error: "Images must be 8 MB or smaller." },
      { status: 413 }
    );
  }

  const name = sanitizeMediaName(file.name);
  if (!name) {
    return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const now = new Date();

  await db
    .insert(deckMedia)
    .values({
      id: randomUUID(),
      deckId: auth.deck.id,
      name,
      mime: file.type,
      bytes,
      size: bytes.byteLength,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [deckMedia.deckId, deckMedia.name],
      set: { mime: file.type, bytes, size: bytes.byteLength, createdAt: now },
    });

  await db
    .update(decks)
    .set({ updatedAt: now })
    .where(eq(decks.id, auth.deck.id));

  return NextResponse.json(
    { name, mime: file.type, size: bytes.byteLength },
    { status: 201 }
  );
}
