"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

/**
 * The shared text-input dialog behind New file / New folder / Rename
 * file / Rename slide.
 *
 * When `basePath` is set it renders as a fixed, non-editable prefix next
 * to the input — the user only ever types the relative part, so the
 * destination can't be wiped or tampered with by a stray keystroke.
 */
export function PathDialog({
  open,
  title,
  description,
  label = "Path",
  basePath,
  placeholder,
  preview,
  draft,
  onDraftChange,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  label?: string;
  /** Fixed input prefix, e.g. "deck/components/" — never editable. */
  basePath?: string;
  placeholder?: string;
  preview?: ReactNode;
  draft: string;
  onDraftChange: (value: string) => void;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on open; the draft starts empty, so the caret simply
  // sits ready at the start — no selection to wipe, no prefix to retype.
  useEffect(() => {
    if (!open) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const end = input.value.length;
    input.setSelectionRange(end, end);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="deck-path">{label}</Label>
          <div className="flex items-stretch">
            {basePath ? (
              <span
                aria-hidden
                className="flex shrink-0 items-center whitespace-nowrap rounded-l-lg border border-r-0 border-input bg-muted px-2.5 font-ui-mono text-xs text-muted-foreground"
              >
                {basePath}
              </span>
            ) : null}
            <Input
              ref={inputRef}
              id="deck-path"
              value={draft}
              placeholder={placeholder}
              spellCheck={false}
              className={cn(
                "font-ui-mono text-xs",
                basePath && "rounded-l-none"
              )}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onConfirm();
                }
              }}
            />
          </div>
          {preview}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
