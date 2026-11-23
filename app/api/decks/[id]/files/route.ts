import { randomUUID } from "node:crypto";
import { and, asc, eq, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  getOwnedDeck,
  isInsidePath,
  isValidDeckPath,
  MAX_FILE_BYTES,
} from "@/lib/decks";

/**
 * Deck file CRUD — the storage API behind the editor workspace.
 * Every handler checks auth + deck ownership before touching rows.
 */

async function requireDeck(ctx: RouteContext<"/api/decks/[id]/files">) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { id } = await ctx.params;
  const deck = await getOwnedDeck(id, user.id);
  if (!deck) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  return { deck };
}

async function touchDeck(deckId: string) {
  await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, deckId));
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

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
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.trim() : "";
  const content = typeof body?.content === "string" ? body.content : "";

  if (!isValidDeckPath(path)) {
    return NextResponse.json(
      { error: "Invalid path. Use deck/<folder>/<file>." },
      { status: 400 }
    );
  }
  if (content.length > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  const existing = await db
    .select({ id: deckFiles.id })
    .from(deckFiles)
    .where(
      and(eq(deckFiles.deckId, auth.deck.id), eq(deckFiles.path, path))
    )
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A file with this path already exists." },
      { status: 409 }
    );
  }

  await db.insert(deckFiles).values({
    id: randomUUID(),
    deckId: auth.deck.id,
    path,
    content,
    updatedAt: new Date(),
  });
  await touchDeck(auth.deck.id);

  return NextResponse.json({ path }, { status: 201 });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path : "";
  const content = typeof body?.content === "string" ? body.content : null;

  if (!isValidDeckPath(path) || content === null) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (content.length > MAX_FILE_BYTES) {
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
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/decks/[id]/files">
) {
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";

  if (!isValidDeckPath(from) || !isValidDeckPath(to) || from === to) {
    return NextResponse.json({ error: "Invalid rename." }, { status: 400 });
  }

  const rows = await db
    .select({ id: deckFiles.id, path: deckFiles.path })
    .from(deckFiles)
    .where(
      and(
        eq(deckFiles.deckId, auth.deck.id),
        or(eq(deckFiles.path, from), like(deckFiles.path, `${from}/%`))
      )
    );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Nothing to rename." }, { status: 404 });
  }

  const moving = new Set(rows.map((row) => row.path));
  const allPaths = await db
    .select({ path: deckFiles.path })
    .from(deckFiles)
    .where(eq(deckFiles.deckId, auth.deck.id));

  const conflict = allPaths.some(
    (row) =>
      !moving.has(row.path) &&
      isInsidePath(row.path, to)
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
  const auth = await requireDeck(ctx);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";
  const recursive = url.searchParams.get("recursive") === "1";

  if (!isValidDeckPath(path)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const rows = await db
    .select({ id: deckFiles.id, path: deckFiles.path })
    .from(deckFiles)
    .where(
      and(
        eq(deckFiles.deckId, auth.deck.id),
        recursive
          ? or(eq(deckFiles.path, path), like(deckFiles.path, `${path}/%`))
          : eq(deckFiles.path, path)
      )
    );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!recursive && rows.length > 1) {
    return NextResponse.json(
      { error: "That is a folder — use recursive delete." },
      { status: 400 }
    );
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx.delete(deckFiles).where(eq(deckFiles.id, row.id));
    }
    await tx.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, auth.deck.id));
  });

  return NextResponse.json({ ok: true, deleted: rows.length });
}
