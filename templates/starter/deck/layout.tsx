import type { DeckLayoutProps } from "@/lib/types";

import { deck } from "./deck.config";

/**
 * The deck's frame — wraps every slide, like a Next.js root layout.
 * Change the background, padding, or footer once; every slide follows.
 * The title is read from deck.config.ts.
 */
export default function DeckLayout({
  children,
  index,
  total,
}: DeckLayoutProps) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-deck-bg px-24 pt-16 pb-10 text-deck-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-56 -right-48 size-[38rem] rounded-full bg-deck-accent/10 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--deck-surface) 1px, transparent 1px), linear-gradient(to bottom, var(--deck-surface) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative flex flex-1 flex-col justify-center">
        {children}
      </div>

      <div className="relative mt-10 flex items-center justify-between border-t border-deck-surface/70 pt-5 font-mono text-xs uppercase tracking-[0.22em] text-deck-muted">
        <span className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-deck-accent" />
          {deck.title}
        </span>
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")}{" "}
          <span className="px-1 text-deck-muted/40">/</span>{" "}
          {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
