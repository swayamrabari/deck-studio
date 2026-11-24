import type { Metadata } from "next";

import { allFontVariableClasses } from "@/lib/fonts";

/**
 * Root layout for the deck runtime — intentionally ISOLATED from the
 * app's chrome: no `globals.css`, no shadcn tokens, no AppShell. The frame
 * supplies its own complete Tailwind (via the browser build) and deck
 * tokens, so deck CSS and app CSS can never overlap.
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
      <head>
        {/* Minimal reset — the frame has no app CSS and deliberately does
            not rely on any (Tailwind utilities are compiled inside the
            frame by the browser build). */}
        <style>{`*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid}h1,h2,h3,h4,h5,h6,p,ul,ol,figure,blockquote,pre{margin:0}ul,ol{list-style:none;padding:0}img,svg{display:block;max-width:100%}button{font:inherit}`}</style>
      </head>
      <body style={{ margin: 0, background: "#000", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
