"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayIcon, Trash2Icon } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

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

  return (
    <div className="group flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        href={`/decks/${id}/edit`}
        className="block flex-1 rounded-t-lg p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <p className="truncate text-sm font-medium">{title}</p>
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
            aria-label={`Present ${title}`}
            className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}
          >
            <PlayIcon />
            Present
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete ${title}`}
                />
              }
            >
              <Trash2Icon />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete deck?</DialogTitle>
                <DialogDescription>
                  &ldquo;{title}&rdquo; and all of its files will be
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
    </div>
  );
}
