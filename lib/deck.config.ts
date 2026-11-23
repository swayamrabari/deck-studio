import type { DeckConfig } from "./types";

/**
 * Deck-wide settings — configures the whole presentation.
 * The slides themselves live in `slides/`.
 */
export const deck: DeckConfig = {
  title: "Untitled Deck",
  aspect: "16:9",
  theme: "midnight",
  defaultTransition: "fade",
  slideNumbers: true,
};
