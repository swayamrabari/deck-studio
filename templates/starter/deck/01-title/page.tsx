import type { SlideMeta } from "@/lib/types";

import { AccentChip } from "../components/accent-chip";

export const meta: SlideMeta = {
  title: "Title",
  notes: "Set the frame: this deck is written, not drawn.",
};

export default function TitleSlide() {
  return (
    <div className="flex flex-col justify-center">
      <p className="eyebrow">pptxgen · starter deck</p>
      <h1 className="mt-6 font-display text-8xl font-medium tracking-tight">
        Slides as code.
      </h1>
      <p className="mt-8 max-w-3xl font-body text-2xl leading-relaxed text-deck-muted">
        This deck is a folder of React components. Edit any page, add
        slides, make it yours — the preview and presenter follow along.
      </p>
      <div className="mt-12 flex items-center gap-4">
        <AccentChip>npm run dev</AccentChip>
        <span className="font-mono text-sm text-deck-muted">
          edit → save → live
        </span>
      </div>
    </div>
  );
}
