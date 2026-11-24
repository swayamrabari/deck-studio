import type { SlideMeta } from "@/lib/types";
import {
  ArrowUpRightIcon,
  LayersIcon,
  PencilIcon,
  PlayIcon,
  PresentationIcon,
  SparklesIcon,
} from "lucide-react";

import { AccentChip } from "../components/accent-chip";

export const meta: SlideMeta = {
  title: "Welcome",
  notes: "A short introduction to what this app does.",
};

export default function TitleSlide() {
  return (
    <div className="grid grid-cols-[1.2fr_0.95fr] items-center gap-16">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-deck-surface bg-deck-surface/40 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.28em] text-deck-muted">
          <SparklesIcon className="size-3.5 text-deck-accent" />
          Welcome to pptxgen
        </div>

        <h1 className="mt-8 font-display text-8xl font-medium leading-[0.92] tracking-[-0.04em]">
          Presentations,
          <span className="block text-deck-accent">written clearly.</span>
        </h1>

        <p className="mt-8 max-w-xl font-body text-2xl leading-relaxed text-deck-muted">
          A deck is a folder of small pages. Write the words, place your
          images, preview instantly, then present fullscreen.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <AccentChip>
            <PencilIcon className="size-4" />
            Write
          </AccentChip>
          <span className="inline-flex items-center gap-2 rounded-full border border-deck-surface px-4 py-2 font-mono text-sm text-deck-muted">
            <LayersIcon className="size-4 text-deck-accent" />
            Preview
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-deck-surface px-4 py-2 font-mono text-sm text-deck-muted">
            <PlayIcon className="size-4 text-deck-accent" />
            Present
          </span>
        </div>
      </div>

      <div className="relative h-[22rem]">
        <div className="absolute top-4 left-6 h-64 w-[19rem] -rotate-6 rounded-2xl border border-deck-surface bg-deck-surface/30" />
        <div className="absolute top-8 left-10 h-64 w-[19rem] rotate-3 rounded-2xl border border-deck-surface bg-deck-surface/50" />

        <div className="relative mt-12 ml-4 h-64 w-[19rem] overflow-hidden rounded-2xl border border-deck-surface bg-deck-bg p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-deck-muted">
              01 / 03
            </span>
            <PresentationIcon className="size-4 text-deck-accent" />
          </div>
          <p className="mt-10 font-display text-4xl leading-tight tracking-tight">
            A clear idea,
            <br />
            well told.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-2">
            <span className="h-12 rounded-md bg-deck-accent/25" />
            <span className="h-12 rounded-md bg-deck-surface" />
            <span className="h-12 rounded-md bg-deck-surface/60" />
          </div>
        </div>

        <div className="absolute right-0 -bottom-2 inline-flex items-center gap-2 rounded-xl border border-deck-surface bg-deck-bg px-4 py-2.5 font-mono text-xs text-deck-muted shadow-xl">
          <ArrowUpRightIcon className="size-3.5 text-deck-accent" />
          write once, present anywhere
        </div>
      </div>
    </div>
  );
}
