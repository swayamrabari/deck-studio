import { deck } from "./deck.config";
import type { SlideAspect } from "./types";

/**
 * Logical canvas sizes — slides are authored at these fixed dimensions and
 * the engine scales them to fit any container. Identical proportions on a
 * thumbnail, a laptop, or a projector.
 */
const CANVAS_SIZES: Record<SlideAspect, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "4:3": { w: 960, h: 720 },
};

export const canvasSize = CANVAS_SIZES[deck.aspect];

/** Tailwind aspect class matching the configured canvas ratio. */
export const canvasAspectClass =
  deck.aspect === "16:9" ? "aspect-video" : "aspect-[4/3]";
