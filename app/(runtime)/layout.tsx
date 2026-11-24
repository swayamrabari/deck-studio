import type { Metadata } from "next";

import { allFontVariableClasses } from "@/lib/fonts";

import "./runtime.css";

/**
 * Root layout for the deck runtime — intentionally ISOLATED from the
 * app's chrome: no `globals.css`, no shadcn tokens, no AppShell. The frame
 * supplies its own complete Tailwind (via the browser build), deck tokens,
 * and root CSS (`runtime.css`), so deck CSS and app CSS can never overlap.
 *
 * Fonts are the only shared asset: the 14 registry families are applied
 * as variables here so `font-display`/`body`/`mono` resolve inside decks.
 */

export const metadata: Metadata = {
  title: "Deck runtime",
};

export default function RuntimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={allFontVariableClasses}>
      <body>{children}</body>
    </html>
  );
}
