import type { DeckLayoutProps } from "@/lib/types";

import { deck } from "./deck.config";

/**
 * The deck's frame — wraps every slide, like a Next.js root layout.
 * Keep it quiet: typography, hairlines, and generous whitespace.
 */
export default function DeckLayout({
  children,
  index,
  total,
}: DeckLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col bg-deck-bg px-24 pt-16 pb-10 text-deck-fg">
      <div className="flex flex-1 flex-col justify-center">{children}</div>
      <div className="flex items-center justify-between border-t border-deck-surface/70 pt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-deck-muted">
        <span>{deck.title}</span>
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")}{" "}
          <span className="px-1 text-deck-muted/40">/</span>{" "}
          {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
