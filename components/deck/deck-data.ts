import type { ComponentType } from "react";
import { slides } from "@/slides";

/** A manifest slide, resolved and ready to render. */
export interface ResolvedSlide {
  component: ComponentType;
  title: string;
  notes?: string;
}

export const deckSlides: ResolvedSlide[] = slides.map((mod) => ({
  component: mod.default,
  title: mod.meta?.title ?? "Untitled",
  notes: mod.meta?.notes,
}));

export const slideCount = deckSlides.length;

/** Zero-padded slide number ("01", "02", …). */
export function slideNumber(index: number): string {
  return String(Math.max(index + 1, 0)).padStart(2, "0");
}
