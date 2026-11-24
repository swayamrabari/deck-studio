import type { SlideMeta } from "@/lib/types";
import {
  ArrowUpRightIcon,
  CommandIcon,
  PlayIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";

import { AccentChip } from "../components/accent-chip";

export const meta: SlideMeta = {
  title: "Title",
  notes: "Set the frame: this deck is written, not drawn.",
};

export default function TitleSlide() {
  return (
    <div className="grid grid-cols-[1.3fr_0.9fr] items-center gap-16">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-deck-surface bg-deck-surface/40 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.28em] text-deck-muted">
          <SparklesIcon className="size-3.5 text-deck-accent" />
          pptxgen · starter deck
        </div>

        <h1 className="mt-8 font-display text-8xl font-medium leading-[0.92] tracking-[-0.04em]">
          Slides as
          <span className="block text-deck-accent">code.</span>
        </h1>

        <p className="mt-8 max-w-xl font-body text-2xl leading-relaxed text-deck-muted">
          A deck is a folder of React components. Edit a page, save it, and
          the preview follows — no design tool, no export.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <AccentChip>
            <TerminalIcon className="size-4" />
            npm run dev
          </AccentChip>
          <span className="inline-flex items-center gap-2 rounded-full border border-deck-surface px-4 py-2 font-mono text-sm text-deck-muted">
            <PlayIcon className="size-3.5 text-deck-accent" />
            live preview
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-6 rounded-[2rem] bg-deck-accent/10 blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-deck-surface bg-deck-surface/50 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-deck-surface/70 px-5 py-3">
            <span className="size-2.5 rounded-full bg-deck-muted/25" />
            <span className="size-2.5 rounded-full bg-deck-muted/20" />
            <span className="size-2.5 rounded-full bg-deck-muted/15" />
            <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-deck-muted/70">
              <CommandIcon className="size-3" /> S
            </span>
          </div>
          <pre className="p-6 font-mono text-[13px] leading-7 text-deck-muted">
            {`export default function Slide() {
  return (
    <TitleSlide
      eyebrow="pptxgen"
      title="Hello, code"
    />
  );
}`}
          </pre>
        </div>

        <div className="absolute -bottom-5 -left-5 inline-flex items-center gap-2 rounded-xl border border-deck-surface bg-deck-bg px-4 py-2.5 font-mono text-xs text-deck-muted shadow-xl">
          <ArrowUpRightIcon className="size-3.5 text-deck-accent" />
          edit → save → live
        </div>
      </div>
    </div>
  );
}
