import "server-only";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { decks, type Deck } from "@/db/schema";

/**
 * Deck contract helpers shared by the workspace API.
 * Every deck file lives under `deck/` — the App Router-shaped root.
 */

export const DECK_ROOT = "deck";

export const MAX_FILE_BYTES = 200_000;

const PATH_RE = /^deck\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;

/** True for valid deck paths: under `deck/`, safe segments, no traversal. */
export function isValidDeckPath(path: string): boolean {
  if (!PATH_RE.test(path)) return false;
  return !path.split("/").some((segment) => segment === "." || segment === "..");
}

/** A deck owned by the user, or null. Enforces ownership on every request. */
export async function getOwnedDeck(deckId: string, userId: string) {
  const [deck] = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.ownerId, userId)))
    .limit(1);
  return deck ?? null;
}

/**
 * Auth + ownership in one step — the guard every deck-scoped API handler
 * runs before touching rows. Returns the deck, or a ready-to-return error
 * response (401 for anonymous requests, 404 for anyone else's deck).
 */
export async function authorizeDeck(
  deckId: string
): Promise<{ deck: Deck } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const deck = await getOwnedDeck(deckId, user.id);
  if (!deck) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { deck };
}

/** Paths that are the path itself or anywhere inside it (folder subtree). */
export function isInsidePath(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}/`);
}
