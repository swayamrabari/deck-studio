"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DeckProvider,
  SlideCanvas,
  deckSlides,
  slideCount,
  slideNumber,
  useDeck,
} from "@/components/deck";

/**
 * Presenter shell (Phase 2 stub): the scaled canvas letterboxed on black,
 * with on-screen navigation. Phase 3 hardens this into the real presenter
 * — keyboard control, fullscreen API, URL sync, progress bar, and fade
 * transitions.
 */
function PresentStage() {
  const { state, next, prev } = useDeck();
  const slide = deckSlides[state.index];

  if (!slide) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <p className="text-sm text-muted-foreground">
          No slides — add one in{" "}
          <span className="font-ui-mono text-xs">slides/</span>.
        </p>
      </div>
    );
  }

  const Slide = slide.component;

  return (
    <div className="flex h-dvh w-full flex-col bg-black">
      <div className="min-h-0 w-full flex-1">
        <SlideCanvas>
          <Slide />
        </SlideCanvas>
      </div>
      <div className="flex items-center justify-center gap-3 pb-6 pt-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          disabled={state.index === 0}
          aria-label="Previous slide"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="font-ui-mono text-xs tabular-nums text-muted-foreground">
          {slideNumber(state.index)} / {slideNumber(slideCount - 1)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          disabled={state.index === slideCount - 1}
          aria-label="Next slide"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

export default function PresentPage() {
  return (
    <DeckProvider count={slideCount}>
      <PresentStage />
    </DeckProvider>
  );
}
