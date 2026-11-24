import type { ComponentType, ReactNode } from "react";

/** Transitions supported between slides by the presenter. */
export type SlideTransition = "fade" | "slide" | "zoom";

/** Per-slide metadata, exported as `meta` from each slide file. */
export interface SlideMeta {
  /** Human-readable title — used by tooling/overview. */
  title?: string;
  /** Freeform notes metadata (kept for deck authors; not surfaced in the presenter). */
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
  /** Deck config: whether slide numbers should be shown. */
  slideNumbers: boolean;
}

/** Aspect ratio of the logical slide canvas. */
export type SlideAspect = "16:9" | "4:3";

/** Progress-bar appearance in the presenter. */
export interface DeckProgressConfig {
  /** Show the bar. */
  show: boolean;
  /** Pin it to the top or bottom edge. */
  position: "top" | "bottom";
  /** Bar height in pixels. */
  height: number;
  /** Filled portion color. */
  color: string;
  /** Unfilled track color. */
  trackColor: string;
}

export const DEFAULT_DECK_PROGRESS: DeckProgressConfig = {
  show: true,
  position: "top",
  height: 2,
  color: "rgba(255, 255, 255, 0.7)",
  trackColor: "rgba(255, 255, 255, 0.1)",
};

/** Deck-wide configuration — see `lib/deck.config.ts`. */
export interface DeckConfig {
  /** Deck title — shown on the overview page and browser tab. */
  title: string;
  /** Logical canvas size; slides are authored at these dimensions. */
  aspect: SlideAspect;
  /** Default transition used between slides (per-slide `meta` wins). */
  defaultTransition: SlideTransition;
  /** Show slide numbers on the slide chrome. */
  slideNumbers: boolean;
  /** Optional presenter progress-bar customization. */
  progress?: Partial<DeckProgressConfig>;
}
