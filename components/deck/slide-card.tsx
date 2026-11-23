"use client";

import { StickyNoteIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { canvasAspectClass } from "@/lib/canvas";
import { SlideCanvas } from "./slide-canvas";

/**
 * Overview card: a live thumbnail (the actual slide, scaled down), with a
 * click-to-preview dialog showing the slide at reading size plus its
 * speaker notes.
 */
export function SlideCard({
  index,
  total,
  title,
  notes,
  children,
}: {
  index: number;
  total: number;
  title: string;
  notes?: string;
  children: React.ReactNode;
}) {
  const num = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        }
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card transition-colors group-hover:border-foreground/25 group-focus-visible:border-foreground/40">
          <div className={canvasAspectClass}>
            <SlideCanvas className="h-full w-full">
              {children}
            </SlideCanvas>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
            <p className="min-w-0 truncate text-sm font-medium">{title}</p>
            <div className="flex shrink-0 items-center gap-2">
              {notes ? (
                <Badge variant="outline">
                  <StickyNoteIcon />
                  notes
                </Badge>
              ) : null}
              <span className="font-ui-mono text-xs text-muted-foreground tabular-nums">
                {num}
              </span>
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] p-3 sm:max-w-2xl">
        <div className={`${canvasAspectClass} overflow-hidden rounded-md border border-border bg-deck-bg`}>
          <SlideCanvas className="h-full w-full">{children}</SlideCanvas>
        </div>
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <p className="min-w-0 truncate text-sm font-medium">{title}</p>
          <span className="shrink-0 font-ui-mono text-xs text-muted-foreground tabular-nums">
            {num} / {totalLabel}
          </span>
        </div>
        {notes ? (
          <p className="px-1 text-sm text-muted-foreground">{notes}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
