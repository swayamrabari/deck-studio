import type { ReactNode } from "react";

/** A deck-local component — import it from any page like any other module. */
export function AccentChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-deck-accent px-4 py-2 font-mono text-sm text-deck-bg">
      {children}
    </span>
  );
}
