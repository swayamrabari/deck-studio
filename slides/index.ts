import type { SlideModule } from "@/lib/types";

import * as title from "./01-title";
import * as whyCode from "./02-why-code";
import * as metrics from "./03-metrics";

/**
 * ── Slide manifest ────────────────────────────────────────────────────
 * The deck, in presentation order. One file per slide in this folder
 * (`01-title.tsx`, `02-why-code.tsx`, …), imported here top-to-bottom.
 *
 * Each slide file default-exports a React component and may export
 * `meta: SlideMeta` with a title, speaker notes, and a transition
 * override. Reordering the deck = reordering entries here (or renaming
 * files). The overview grid, presenter, and speaker view all read from
 * this list.
 */
export const slides: SlideModule[] = [title, whyCode, metrics];
