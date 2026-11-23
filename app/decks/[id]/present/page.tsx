import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { DeckPresenter } from "@/components/presenter/deck-presenter";
import { db } from "@/db";
import { deckFiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getOwnedDeck } from "@/lib/decks";

// Auth-gated: reads the session cookie, so the route blocks on the server.
export const instant = false;

/** Hosted presenter: the deck rendered through the runtime frame. */
export default async function DeckPresentPage({
  params,
  searchParams,
}: PageProps<"/decks/[id]/present">) {
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

  const query = await searchParams;
  const rawSlide = Array.isArray(query.s) ? query.s[0] : query.s;
  const slide = Number.parseInt(rawSlide ?? "1", 10);
  const initialSlide = Math.max(0, (Number.isFinite(slide) ? slide : 1) - 1);
  const rawStep = Array.isArray(query.st) ? query.st[0] : query.st;
  const parsedStep = Number.parseInt(rawStep ?? "0", 10);
  const initialStep = Math.max(0, Number.isFinite(parsedStep) ? parsedStep : 0);

  return (
    <DeckPresenter
      deckId={deck.id}
      title={deck.title}
      files={initialFiles}
      initialSlide={initialSlide}
      initialStep={initialStep}
    />
  );
}
