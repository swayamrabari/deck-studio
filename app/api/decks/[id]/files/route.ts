import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, isUniqueViolation } from "@/db";
import { deckFiles, decks } from "@/db/schema";
import {
  authorizeDeck,
  isInsidePath,
  isValidDeckPath,
  MAX_FILE_BYTES,
} from "@/lib/decks";
import { readJsonBody } from "@/lib/http";

/**
 * Deck file CRUD — the storage API behind the editor workspace.
 * Every handler checks auth + deck ownership before touching rows.
 */

function fileTooLarge(content: string): boolean {
  // Byte-accurate: a 200k-char file of multibyte text is up to 600 KB.
  return Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES;
}

async function touchDeck(deckId: string) {
  await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, deckId));
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const { id } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  const files = await db
    .select({ path: deckFiles.path, content: deckFiles.content })
    .from(deckFiles)
    .where(eq(deckFiles.deckId, auth.deck.id))
    .orderBy(asc(deckFiles.path));

  return NextResponse.json({ files });
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const { id } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
  const path = typeof body?.path === "string" ? body.path.trim() : "";
  const content = typeof body?.content === "string" ? body.content : "";

  if (!isValidDeckPath(path)) {
    return NextResponse.json(
      { error: "Invalid path. Use deck/<folder>/<file>." },
      { status: 400 }
    );
  }
  if (fileTooLarge(content)) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  try {
    await db.insert(deckFiles).values({
      id: randomUUID(),
      deckId: auth.deck.id,
      path,
      content,
      updatedAt: new Date(),
    });
  } catch (error) {
    // The (deckId, path) unique index is the real guard — surface the
    // concurrent-create race as a conflict instead of a 500.
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A file with this path already exists." },
        { status: 409 }
      );
    }
    throw error;
  }
  await touchDeck(auth.deck.id);

  return NextResponse.json({ path }, { status: 201 });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const { id } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
  const path = typeof body?.path === "string" ? body.path : "";
  const content = typeof body?.content === "string" ? body.content : null;

  if (!isValidDeckPath(path) || content === null) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (fileTooLarge(content)) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  const existing = await db
    .select({ id: deckFiles.id })
    .from(deckFiles)
    .where(
      and(eq(deckFiles.deckId, auth.deck.id), eq(deckFiles.path, path))
    )
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  await db
    .update(deckFiles)
    .set({ content, updatedAt: new Date() })
    .where(eq(deckFiles.id, existing[0].id));
  await touchDeck(auth.deck.id);

  return NextResponse.json({ ok: true });
}

/**
 * Rename / move a file or folder subtree: updates every path that equals
 * `from` or lives beneath it.
 *
 * The moving set is computed in JS with exact prefix semantics. A SQL LIKE
 * would be wrong here: `_` (allowed in deck paths) is a LIKE wildcard, so
 * renaming `deck/01_why` would also drag `deck/01-why` along.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const { id } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  const { data: body, error: bodyError } = await readJsonBody(request);
  if (bodyError) return bodyError;
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";

  if (!isValidDeckPath(from) || !isValidDeckPath(to) || from === to) {
    return NextResponse.json({ error: "Invalid rename." }, { status: 400 });
  }

  const allRows = await db
    .select({ id: deckFiles.id, path: deckFiles.path })
    .from(deckFiles)
    .where(eq(deckFiles.deckId, auth.deck.id));

  const rows = allRows.filter((row) => isInsidePath(row.path, from));
  if (rows.length === 0) {
    return NextResponse.json({ error: "Nothing to rename." }, { status: 404 });
  }

  const moving = new Set(rows.map((row) => row.path));
  const conflict = allRows.some(
    (row) => !moving.has(row.path) && isInsidePath(row.path, to)
  );
  if (conflict) {
    return NextResponse.json(
      { error: "A file or folder already exists at the new path." },
      { status: 409 }
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const nextPath = to + row.path.slice(from.length);
      await tx
        .update(deckFiles)
        .set({ path: nextPath, updatedAt: now })
        .where(eq(deckFiles.id, row.id));
    }
    await tx.update(decks).set({ updatedAt: now }).where(eq(decks.id, auth.deck.id));
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const { id } = await ctx.params;
  const auth = await authorizeDeck(id);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";
  const recursive = url.searchParams.get("recursive") === "1";

  if (!isValidDeckPath(path)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  // Exact prefix semantics (see PATCH) instead of a LIKE, which would
  // treat `_` in the path as a wildcard.
  const allRows = await db
    .select({ id: deckFiles.id, path: deckFiles.path })
    .from(deckFiles)
    .where(eq(deckFiles.deckId, auth.deck.id));
  const rows = allRows.filter((row) =>
    recursive ? isInsidePath(row.path, path) : row.path === path
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(deckFiles).where(
      inArray(
        deckFiles.id,
        rows.map((row) => row.id)
      )
    );
    await tx.update(decks).set({ updatedAt: now }).where(eq(decks.id, auth.deck.id));
  });

  return NextResponse.json({ ok: true, deleted: rows.length });
}
