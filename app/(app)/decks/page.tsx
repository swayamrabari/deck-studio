import { and, desc, eq, inArray, like } from "drizzle-orm";
import { redirect } from "next/navigation";

import { DeckCard } from "@/components/decks/deck-card";
import { NewDeckButton } from "@/components/decks/new-deck-button";
import { UserMenu } from "@/components/decks/user-menu";
import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isSlideFilePath } from "@/lib/runtime-protocol";

// Auth-gated dashboard: reads the session cookie, so the route blocks on
// the server instead of prerendering a shell.
export const instant = false;

export default async function DecksPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const myDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.ownerId, user.id))
    .orderBy(desc(decks.updatedAt));

  const ids = myDecks.map((deck) => deck.id);
  // LIKE prefilter, then the exact slide rule (`deck/NN-name/page.tsx`) —
  // the same predicate the workspace uses, so badges never disagree.
  const slideRows =
    ids.length > 0
      ? await db
          .select({ deckId: deckFiles.deckId, path: deckFiles.path })
          .from(deckFiles)
          .where(
            and(
              inArray(deckFiles.deckId, ids),
              like(deckFiles.path, "%/page.tsx")
            )
          )
      : [];

  const counts = new Map<string, number>();
  for (const row of slideRows) {
    if (isSlideFilePath(row.path)) {
      counts.set(row.deckId, (counts.get(row.deckId) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Decks · {myDecks.length}
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Your decks</h1>
        </div>
        <div className="flex items-center gap-2">
          <NewDeckButton />
          <UserMenu email={user.email} />
        </div>
      </header>

      {myDecks.length === 0 ? (
        <div className="mt-16 rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-medium">No decks yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first deck — it starts from a small starter template
            you can make yours.
          </p>
          <div className="mt-6 flex justify-center">
            <NewDeckButton />
          </div>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              id={deck.id}
              title={deck.title}
              slideCount={counts.get(deck.id) ?? 0}
              updatedAt={deck.updatedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
