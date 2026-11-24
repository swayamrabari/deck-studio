import "server-only";

import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";

/**
 * The starter template — a real folder of deck-contract files under
 * `templates/starter/`. "New deck" copies it into the database, so every
 * account begins with a working, editable deck.
 */

export const STARTER_TITLE = "My presentation";

/** The deck's single styles file (part of the deck contract). */
export const STYLES_PATH = "deck/styles.css";

const STYLES_TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "starter",
  STYLES_PATH
);

const BASE_START = "/* @deck-base:start v2";
const BASE_END = "/* @deck-base:end */";
const LEGACY_BASE_START = "/* @deck-base:start";

export type StarterFiles = Record<string, string>;

export async function readStarterFiles(): Promise<StarterFiles> {
  const root = path.join(process.cwd(), "templates", "starter");
  const files: StarterFiles = {};

  async function walk(dir: string, rel: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), relPath);
      } else {
        files[relPath] = await readFile(path.join(dir, entry.name), "utf8");
      }
    }
  }

  await walk(root, "");
  return files;
}

/** Creates a new deck owned by `userId`, seeded from the starter template. */
export async function createDeckFromStarter(
  userId: string
): Promise<{ id: string; title: string }> {
  const id = randomUUID();
  const now = new Date();

  await db.insert(decks).values({
    id,
    ownerId: userId,
    title: STARTER_TITLE,
    createdAt: now,
    updatedAt: now,
  });

  const files = await readStarterFiles();
  const rows = Object.entries(files).map(([filePath, content]) => ({
    id: randomUUID(),
    deckId: id,
    path: filePath,
    content,
    updatedAt: now,
  }));
  if (rows.length > 0) {
    await db.insert(deckFiles).values(rows);
  }

  return { id, title: STARTER_TITLE };
}

/**
 * The editable frame block at the top of the starter stylesheet. It is
 * extracted verbatim so existing decks can receive exactly the same
 * editable CSS as new decks.
 */
async function readDeckBaseCss(): Promise<string | null> {
  let css: string;
  try {
    css = await readFile(STYLES_TEMPLATE_PATH, "utf8");
  } catch {
    return null;
  }

  const start = css.indexOf(BASE_START);
  const end = css.indexOf(BASE_END);
  if (start === -1 || end === -1) return null;
  return css.slice(start, end + BASE_END.length).trim();
}

/**
 * Guarantees a deck has its single styles file — backfills decks created
 * before the `styles.css` convention. Returns the seeded content when it
 * was just created, or null when the file already existed.
 */
export async function ensureDeckStylesFile(
  deckId: string
): Promise<string | null> {
  const existing = await db
    .select({ id: deckFiles.id })
    .from(deckFiles)
    .where(and(eq(deckFiles.deckId, deckId), eq(deckFiles.path, STYLES_PATH)))
    .limit(1);
  if (existing.length > 0) return null;

  const template = await readStarterFiles();
  const css = template[STYLES_PATH];
  if (!css) return null;

  await db.insert(deckFiles).values({
    id: randomUUID(),
    deckId,
    path: STYLES_PATH,
    content: css,
    updatedAt: new Date(),
  });
  return css;
}

/**
 * Prepends (or upgrades) the editable deck-frame block. The base is
 * written into the deck file itself (not injected by the platform), so
 * every rule is editable. Returns the new content when it changed, or
 * null when the current base is already present.
 */
export async function ensureDeckBaseCss(
  deckId: string,
  content: string
): Promise<string | null> {
  if (content.includes(BASE_START)) return null;

  const base = await readDeckBaseCss();
  if (!base) return null;

  const legacyStart = content.indexOf(LEGACY_BASE_START);
  const legacyEnd = content.indexOf(BASE_END);

  let next: string;
  if (legacyStart !== -1 && legacyEnd !== -1) {
    // Replace the old commented/theme-token base with the standalone one.
    next =
      content.slice(0, legacyStart) +
      base +
      content.slice(legacyEnd + BASE_END.length);
  } else {
    next = `${base}\n\n${content.trimStart()}`;
  }

  if (next === content) return null;

  await db
    .update(deckFiles)
    .set({ content: next, updatedAt: new Date() })
    .where(
      and(eq(deckFiles.deckId, deckId), eq(deckFiles.path, STYLES_PATH))
    );
  return next;
}

/**
 * Ensures the deck's stylesheet exists and contains the editable frame
 * block. Returns new content when the page should use it in memory.
 */
export async function ensureDeckStyles(
  deckId: string,
  current: string | undefined
): Promise<string | null> {
  if (current === undefined) return ensureDeckStylesFile(deckId);
  return ensureDeckBaseCss(deckId, current);
}
