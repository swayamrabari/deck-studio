import type { Metadata } from "next";
import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { deck } from "@/lib/deck.config";
import { allFontVariableClasses, deckFontVars } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "pptxgen — code-first deck",
  description:
    "A code-first presentation engine: slides as React components, presented in-app. No exports.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${allFontVariableClasses} h-full antialiased`}
      style={deckFontVars(deck.fonts)}
    >
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
