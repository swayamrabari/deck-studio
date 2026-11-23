/** Deck theme palettes — consumed by the runtime frame via CSS vars. */

export interface DeckThemePalette {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  accent: string;
}

export const DECK_THEMES: Record<"midnight" | "paper", DeckThemePalette> = {
  midnight: {
    bg: "#0b0e14",
    surface: "#131826",
    fg: "#e8ecf3",
    muted: "#9aa4b8",
    accent: "#7aa2f7",
  },
  paper: {
    bg: "#f7f5ef",
    surface: "#e9e5da",
    fg: "#211f1a",
    muted: "#6d685d",
    accent: "#9a6b2f",
  },
};
