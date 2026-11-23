import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { FileIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { deckFiles, decks } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// Auth-gated: reads the session cookie, so the route blocks on the server.
export const instant = false;

/**
 * Placeholder for the Phase 4 workspace: proves the full loop
 * (auth → create → seed → store) by listing the deck's stored files.
 * The editor (file tree + CodeMirror + live preview) replaces this page.
 */
export default async function DeckEditPage({
  params,
}: PageProps<"/decks/[id]/edit">) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const [deck] = await db
    .select()
    .from(decks)
    .where(eq(decks.id, id))
    .limit(1);
  if (!deck || deck.ownerId !== user.id) notFound();

  const files = await db
    .select({ path: deckFiles.path })
    .from(deckFiles)
    .where(eq(deckFiles.deckId, id))
    .orderBy(asc(deckFiles.path));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Deck · {files.length} files
          </p>
          <h1 className="text-3xl font-medium tracking-tight">{deck.title}</h1>
        </div>
        <Badge variant="outline">Workspace lands in Phase 4</Badge>
      </header>

      <ul className="mt-10 divide-y divide-border rounded-lg border border-border">
        {files.map((file) => (
          <li key={file.path} className="flex items-center gap-3 px-4 py-3">
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-ui-mono text-sm">{file.path}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-muted-foreground">
        This deck is stored and ready. The editor workspace — file tree,
        code editor, live preview — arrives in the next phase.
      </p>
    </div>
  );
}
