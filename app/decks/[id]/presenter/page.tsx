import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { SpeakerConsole } from "@/components/presenter/speaker-console";
import { db } from "@/db";
import { deckFiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/decks";

// Auth-gated: reads the session cookie, so the route blocks on the server.
export const instant = false;

/** Second-window speaker console, synced to the presenter via BroadcastChannel. */
export default async function SpeakerPage({
  params,
}: PageProps<"/decks/[id]/presenter">) {
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
    <SpeakerConsole deckId={deck.id} title={deck.title} files={initialFiles} />
  );
}
