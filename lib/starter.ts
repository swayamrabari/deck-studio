import "server-only";

import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";

/**
 * The starter template — a real folder of deck-contract files under
 * `templates/starter/`. "New deck" copies it into the database, so every
 * account begins with a working, editable deck.
 */

export const STARTER_TITLE = "Slides as code";

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
