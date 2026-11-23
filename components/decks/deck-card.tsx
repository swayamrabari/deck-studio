"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="group relative rounded-lg border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        href={`/decks/${id}/edit`}
        className="block rounded-lg p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <p className="truncate text-sm font-medium">{title}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline">{slideCount} slides</Badge>
          <span className="text-xs text-muted-foreground">{updatedAt}</span>
        </div>
      </Link>

      <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
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
                &ldquo;{title}&rdquo; and all of its files will be permanently
                removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={pending} />}>
                Cancel
              </DialogClose>
              <Button variant="destructive" onClick={onDelete} disabled={pending}>
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
