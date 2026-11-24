/**
 * The deck contract in pure, client-safe form — no server imports, so
 * client components (new-deck dialog, workspace chrome) share the exact
 * constants and helpers the server uses.
 */

export const STARTER_TITLE = "My presentation";
export const DECK_CONFIG_PATH = "deck/deck.config.ts";
/** The deck's single styles file (part of the deck contract). */
export const STYLES_PATH = "deck/styles.css";

/** Writes a new title into a deck config source without reformatting it. */
export function applyDeckTitle(content: string, title: string): string {
  return content.replace(
    /\btitle:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/,
    () => `title: ${JSON.stringify(title)}`
  );
}
