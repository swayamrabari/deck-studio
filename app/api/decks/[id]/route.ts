import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";
import { authorizeDeck } from "@/lib/decks";
import { readJsonBody } from "@/lib/http";
import { applyDeckTitle, DECK_CONFIG_PATH } from "@/lib/starter";

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
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
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
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  await db.delete(decks).where(eq(decks.id, id));
  revalidateDeck(id);
  return NextResponse.json({ ok: true });
}
