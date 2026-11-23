import type { SlideModule } from "@/lib/types";

/**
 * ── Slide manifest ────────────────────────────────────────────────────
 * The deck, in presentation order.
 *
 * Author one file per slide in this folder (`01-title.tsx`,
 * `02-agenda.tsx`, …) and import it here top-to-bottom. Each slide file:
 *
 *   export const meta: SlideMeta = { title, notes, transition? };
 *   export default function MySlide() { … }
 *
 * Reordering the deck = reordering entries here (or renaming files).
 * The presenter, speaker view, and overview grid all read from this list.
 *
 * Example:
 *
 *   import * as title from "./01-title";
 *   import * as agenda from "./02-agenda";
 *
 *   export const slides: SlideModule[] = [title, agenda];
 *
 * The engine that consumes this manifest is built in Phase 1 — see
 * PLAN.md §7 for the roadmap.
 */
export const slides: SlideModule[] = [];
