import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { DeckWorkspace } from "@/components/workspace/deck-workspace";
import { db } from "@/db";
import { deckFiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/decks";

// Auth-gated: reads the session cookie, so the route blocks on the server.
export const instant = false;

/** The deck workspace: file tree │ editor │ preview (Phase 5). */
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

  return (
    <DeckWorkspace deckId={deck.id} title={deck.title} initialFiles={initialFiles} />
  );
}
