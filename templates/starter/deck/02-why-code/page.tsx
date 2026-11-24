import type { SlideMeta } from "@/lib/types";
import {
  BracesIcon,
  FolderTreeIcon,
  MonitorPlayIcon,
  ZapIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "Why code",
  notes: "Each point is data mapped to markup — no text boxes were dragged.",
};

const POINTS = [
  {
    icon: ZapIcon,
    k: "Live preview",
    d: "Edit a slide — the preview re-renders instantly, in your browser.",
  },
  {
    icon: BracesIcon,
    k: "React, not shapes",
    d: "Loops, conditionals, hooks, data. Slides are components like any other page.",
  },
  {
    icon: FolderTreeIcon,
    k: "A real folder",
    d: "A deck is a Next.js-shaped tree: layout, pages, styles, and colocated components.",
  },
  {
    icon: MonitorPlayIcon,
    k: "Present anywhere",
    d: "Fullscreen presenting, keyboard control, and reveal steps are built in.",
  },
];

export default function WhyCodeSlide() {
  return (
    <div>
      <div className="flex items-end justify-between gap-10">
        <div>
          <p className="eyebrow">The case for code</p>
          <h2 className="mt-4 max-w-3xl font-display text-6xl font-medium leading-[1.05] tracking-tight">
            Why author slides in code?
          </h2>
        </div>
        <p className="max-w-xs text-right font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-deck-muted">
          Four reasons
          <br />
          to skip the drag
        </p>
      </div>

      <div className="mt-10 grid grid-cols-4 gap-3">
        {POINTS.map(({ icon: Icon, k, d }, index) => (
          <div
            key={k}
            className="group relative overflow-hidden rounded-2xl border border-deck-surface bg-deck-surface/30 p-5 transition-colors hover:border-deck-accent/30"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl border border-deck-surface bg-deck-bg/60 text-deck-accent">
                <Icon className="size-4" />
              </span>
              <span className="font-mono text-xs text-deck-muted/50">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-5 font-display text-xl font-medium leading-snug">
              {k}
            </p>
            <p className="mt-2 font-body text-base leading-snug text-deck-muted">
              {d}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
