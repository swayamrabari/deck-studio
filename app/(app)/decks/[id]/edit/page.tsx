import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { DeckWorkspace } from "@/components/workspace/deck-workspace";
import { db } from "@/db";
import { deckFiles, deckMedia } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/decks";
import { ensureDeckStylesFile, STYLES_PATH } from "@/lib/starter";

// Auth-gated: reads the session cookie, so the route blocks on the server.
export const instant = false;

/** The deck workspace: file tree │ editor │ live preview. */
export default async function DeckEditPage({
  params,
}: PageProps<"/decks/[id]/edit">) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const deck = await getOwnedDeck(id, user.id);
  if (!deck) notFound();

  const rows = await db
    .select({ path: deckFiles.path, content: deckFiles.content })
    .from(deckFiles)
    .where(eq(deckFiles.deckId, id))
    .orderBy(asc(deckFiles.path));

  const initialFiles = Object.fromEntries(
    rows.map((row) => [row.path, row.content])
  );

  // Every deck gets exactly one brand-styles file (backfilled if missing).
  const seededStyles = await ensureDeckStylesFile(deck.id);
  if (seededStyles !== null) {
    initialFiles[STYLES_PATH] = seededStyles;
  }

  const mediaRows = await db
    .select({ name: deckMedia.name, size: deckMedia.size, mime: deckMedia.mime })
    .from(deckMedia)
    .where(eq(deckMedia.deckId, id))
    .orderBy(asc(deckMedia.name));

  return (
    <DeckWorkspace
      deckId={deck.id}
      title={deck.title}
      initialFiles={initialFiles}
      initialMedia={mediaRows}
    />
  );
}
