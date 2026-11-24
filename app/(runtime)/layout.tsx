import type { Metadata } from "next";

import "./runtime.css";

/**
 * Root layout for the deck runtime — intentionally ISOLATED from the
 * app's chrome: no `globals.css`, no shadcn tokens, no AppShell, no app
 * fonts, no theme presets. The deck supplies its own CSS, including its
 * frame, palette, and typography.
 */

export const metadata: Metadata = {
  title: "Deck runtime",
  // Host-only frame URL: never show up in search results.
  robots: { index: false, follow: false },
};

export default function RuntimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
