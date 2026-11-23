import type { DeckLayoutProps } from "@/lib/types";
import { deck } from "./deck.config";

/**
 * The deck's frame — wraps every slide, like a Next.js root layout.
 * Change the background, padding, or footer once; every slide follows.
 * The title is read from `deck.config.ts`.
 */
export default function DeckLayout({
  children,
  index,
  total,
}: DeckLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col bg-deck-bg px-24 py-20 text-deck-fg">
      <div className="flex flex-1 flex-col justify-center">{children}</div>
      <div className="flex items-center justify-between font-mono text-sm text-deck-muted">
        <span>{deck.title}</span>
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
