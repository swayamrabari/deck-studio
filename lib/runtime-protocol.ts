/**
 * postMessage protocol between the workspace/presenter host and the
 * sandboxed runtime frame.
 */

import type { DeckProgressConfig } from "./types";

export type RuntimeInMessage =
  | { type: "deck:ping" }
  | {
      type: "deck:load";
      files: Record<string, string>;
      index: number;
      step?: number;
      /** Enables the `media()` helper inside the deck. */
      deckId?: string;
    }
  | { type: "deck:index"; index: number; step?: number }
  | { type: "deck:step"; step: number };

export type RuntimeOutMessage =
  | { type: "deck:frame-ready" }
  | {
      type: "deck:ready";
      slideCount: number;
      progress: DeckProgressConfig;
    }
  | { type: "deck:steps"; index: number; totalSteps: number }
  | { type: "deck:error"; message: string };

const SLIDE_RE = /^deck\/(\d+)-[^/]+\/page\.tsx$/;

/** Slide file paths in presentation order (numeric folder prefixes). */
export function slideFilePaths(
  paths: string[] | Record<string, string>
): string[] {
  const list = Array.isArray(paths) ? paths : Object.keys(paths);
  return list
    .filter((path) => SLIDE_RE.test(path))
    .sort((a, b) => {
      const na = Number(/^deck\/(\d+)-/.exec(a)?.[1] ?? 0);
      const nb = Number(/^deck\/(\d+)-/.exec(b)?.[1] ?? 0);
      return na - nb || a.localeCompare(b);
    });
}

/** The slide index to show for an active file (slide files only), else 0. */
export function slideIndexForPath(
  files: Record<string, string>,
  activePath: string | null
): number {
  if (!activePath) return 0;
  const slides = slideFilePaths(files);
  const index = slides.indexOf(activePath);
  return index >= 0 ? index : 0;
}
