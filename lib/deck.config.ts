import type { DeckConfig } from "./types";

/**
 * App-side deck settings for the legacy local presenter/preview. Hosted
 * decks read their own `deck/deck.config.ts`; styling never comes from
 * this file.
 */
export const deck: DeckConfig = {
  title: "Slides as code",
  aspect: "16:9",
  slideNumbers: true,
};
