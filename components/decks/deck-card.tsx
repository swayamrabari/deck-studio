"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PencilIcon, PlayIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

export function DeckCard({
  id,
  title,
  slideCount,
  updatedAt,
}: {
  id: string;
  title: string;
  slideCount: number;
  updatedAt: string;
}) {
  const router = useRouter();
  const [deckTitle, setDeckTitle] = useState(title);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function onDelete() {
    setPending(true);
    try {
      const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function onRename() {
    setRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/decks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameValue }),
      });
      const data = (await res.json().catch(() => null)) as {
        title?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.title) {
        setRenameError(data?.error ?? "Could not rename the deck.");
        return;
      }
      setDeckTitle(data.title);
      setRenameOpen(false);
      router.refresh();
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        href={`/decks/${id}/edit`}
        className="block flex-1 rounded-t-lg p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <p className="truncate text-sm font-medium">{deckTitle}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline">{slideCount} slides</Badge>
          <span className="text-xs text-muted-foreground">{updatedAt}</span>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5">
        <span className="pl-1 font-ui-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          deck
        </span>
        <div className="flex items-center gap-1">
          <Link
            href={`/decks/${id}/present`}
            aria-label={`Present ${deckTitle}`}
            className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}
          >
            <PlayIcon />
            Present
          </Link>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Rename ${deckTitle}`}
            onClick={() => {
              setRenameValue(deckTitle);
              setRenameError(null);
              setRenameOpen(true);
            }}
          >
            <PencilIcon />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete ${deckTitle}`}
                />
              }
            >
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete deck?</DialogTitle>
                <DialogDescription>
                  &ldquo;{deckTitle}&rdquo; and all of its files will be
                  permanently removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" disabled={pending} />}
                >
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  disabled={pending}
                >
                  {pending ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={(next) => {
          if (!renaming) setRenameOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename deck</DialogTitle>
            <DialogDescription>
              Updates the project name and the title in deck.config.ts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`deck-title-${id}`}>Deck name</Label>
            <Input
              id={`deck-title-${id}`}
              value={renameValue}
              autoFocus
              className="text-sm"
              onChange={(event) => setRenameValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !renaming) {
                  event.preventDefault();
                  void onRename();
                }
              }}
            />
          </div>
          {renameError ? (
            <p className="text-sm text-destructive">{renameError}</p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button onClick={() => void onRename()} disabled={renaming}>
              {renaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
