import type { ComponentType, ReactNode } from "react";
import type { DeckFonts } from "./fonts";

/** Transitions supported between slides by the presenter. */
export type SlideTransition = "fade" | "slide" | "zoom";

/** Per-slide metadata, exported as `meta` from each slide file. */
export interface SlideMeta {
  /** Human-readable title — shown in the overview grid and speaker view. */
  title?: string;
  /** Speaker notes — shown in the speaker console. */
  notes?: string;
  /** Per-slide transition override; the deck default is used otherwise. */
  transition?: SlideTransition;
}

/**
 * The shape of a slide module from `slides/*.tsx`.
 * Each slide file default-exports a React component and may export `meta`.
 */
export interface SlideModule {
  default: ComponentType;
  meta?: SlideMeta;
}

/** Props the runtime passes to a deck's `layout.tsx` for every slide. */
export interface DeckLayoutProps {
  children: ReactNode;
  /** Zero-based index of the slide being rendered. */
  index: number;
  /** Total slides in the deck. */
  total: number;
  /** The current slide's metadata. */
  meta: SlideMeta;
}

/** Aspect ratio of the logical slide canvas. */
export type SlideAspect = "16:9" | "4:3";

/** Deck-wide configuration — see `lib/deck.config.ts`. */
export interface DeckConfig {
  /** Deck title — shown on the overview page and browser tab. */
  title: string;
  /** Logical canvas size; slides are authored at these dimensions. */
  aspect: SlideAspect;
  /** Theme preset name — drives the deck color/font tokens. */
  theme: "midnight" | "paper";
  /** Default transition used between slides (per-slide `meta` wins). */
  defaultTransition: SlideTransition;
  /** Show slide numbers on the slide chrome. */
  slideNumbers: boolean;
  /** Deck typography — semantic slots filled from the font registry. */
  fonts: DeckFonts;
}
