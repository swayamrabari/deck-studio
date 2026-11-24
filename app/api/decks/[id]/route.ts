import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  applyDeckTitle,
  DECK_CONFIG_PATH,
} from "@/lib/starter";

async function ownedDeck(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [deck] = await db
    .select({ id: decks.id, ownerId: decks.ownerId })
    .from(decks)
    .where(eq(decks.id, id))
    .limit(1);

  if (!deck || deck.ownerId !== user.id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { deck };
}

function revalidateDeck(id: string) {
  revalidatePath("/decks");
  revalidatePath(`/decks/${id}/edit`);
  revalidatePath(`/decks/${id}/present`);
}

/** Renames a deck and keeps its deck.config title in sync. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]">
) {
  const { id } = await ctx.params;
  const auth = await ownedDeck(id);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const title =
    typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) {
    return NextResponse.json({ error: "Deck name is required." }, { status: 400 });
  }

  await db
    .update(decks)
    .set({ title, updatedAt: new Date() })
    .where(eq(decks.id, id));

  const [config] = await db
    .select({ id: deckFiles.id, content: deckFiles.content })
    .from(deckFiles)
    .where(
      and(eq(deckFiles.deckId, id), eq(deckFiles.path, DECK_CONFIG_PATH))
    )
    .limit(1);

  let nextConfig: string | undefined;
  if (config) {
    nextConfig = applyDeckTitle(config.content, title);
    if (nextConfig !== config.content) {
      await db
        .update(deckFiles)
        .set({ content: nextConfig, updatedAt: new Date() })
        .where(eq(deckFiles.id, config.id));
    }
  }

  revalidateDeck(id);
  return NextResponse.json({ ok: true, title, config: nextConfig });
}

/** Deletes a deck owned by the signed-in user (files cascade via FK). */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]">
) {
  const { id } = await ctx.params;
  const auth = await ownedDeck(id);
  if (auth.error) return auth.error;

  await db.delete(decks).where(eq(decks.id, id));
  revalidateDeck(id);
  return NextResponse.json({ ok: true });
}
