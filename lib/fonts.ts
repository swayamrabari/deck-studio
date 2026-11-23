import type { CSSProperties } from "react";
import {
  Fraunces,
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Playfair_Display,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";

/**
 * ── Font registry ────────────────────────────────────────────────────
 * Every family the app can use, Google-hosted via next/font (self-hosted
 * at build time). Each entry declares its own CSS variable; the root
 * layout applies all `.variable` classes to <html> so every family is
 * available everywhere. Browsers only download the files for families
 * that are actually applied.
 *
 * Adding a font = one entry here (any next/font/google family, or
 * next/font/local for a bundled file). Then pick it in deck.config.
 */

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const sourceSerif4 = Source_Serif_4({ variable: "--font-source-serif-4", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair-display", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export interface FontEntry {
  /** Runtime CSS variable that holds the font family stack. */
  varName: string;
  /** Class name that defines the variable — applied once, on <html>. */
  variableClass: string;
  /** Rough classification — drives grouping on the /style specimen page. */
  category: "sans" | "display" | "serif" | "mono";
}

export const fontRegistry = {
  Geist: { varName: "--font-geist-sans", variableClass: geist.variable, category: "sans" },
  Inter: { varName: "--font-inter", variableClass: inter.variable, category: "sans" },
  "Space Grotesk": { varName: "--font-space-grotesk", variableClass: spaceGrotesk.variable, category: "display" },
  "Source Serif 4": { varName: "--font-source-serif-4", variableClass: sourceSerif4.variable, category: "serif" },
  "Playfair Display": { varName: "--font-playfair-display", variableClass: playfair.variable, category: "display" },
  Fraunces: { varName: "--font-fraunces", variableClass: fraunces.variable, category: "display" },
  "JetBrains Mono": { varName: "--font-jetbrains-mono", variableClass: jetbrainsMono.variable, category: "mono" },
  "Geist Mono": { varName: "--font-geist-mono", variableClass: geistMono.variable, category: "mono" },
} satisfies Record<string, FontEntry>;

export type FontKey = keyof typeof fontRegistry;

/** Semantic slots filled by deck.config — the deck's entire type system. */
export interface DeckFonts {
  display: FontKey;
  body: FontKey;
  mono: FontKey;
}

/** All `.variable` classes, applied to <html> once by the root layout. */
export const allFontVariableClasses: string = Object.values(fontRegistry)
  .map((entry) => entry.variableClass)
  .join(" ");

/**
 * Inline style for <html>: maps the semantic deck font slots onto the
 * families chosen in deck.config. The `--deck-font-*` variables are
 * consumed by the `font-display` / `font-body` / `font-mono` utilities
 * (see app/globals.css), so a font swap is a config-only change.
 */
export function deckFontVars(fonts: DeckFonts): CSSProperties {
  return {
    "--deck-font-display": `var(${fontRegistry[fonts.display].varName})`,
    "--deck-font-body": `var(${fontRegistry[fonts.body].varName})`,
    "--deck-font-mono": `var(${fontRegistry[fonts.mono].varName})`,
  } as CSSProperties;
}
