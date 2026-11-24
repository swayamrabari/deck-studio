import type { SlideMeta } from "@/lib/types";
import {
  MonitorPlayIcon,
  PencilIcon,
  PlayIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "How it works",
  notes: "Write, preview, present — the whole workflow.",
};

const STEPS = [
  {
    icon: PencilIcon,
    k: "Write",
    d: "Every slide is a small page. Add text, images, icons, and the building blocks you already know.",
  },
  {
    icon: MonitorPlayIcon,
    k: "Preview",
    d: "The preview pane updates as you type. What you see there is exactly what the audience gets.",
  },
  {
    icon: PlayIcon,
    k: "Present",
    d: "Go fullscreen and use the arrow keys. Reveal points one at a time to keep the room with you.",
  },
];

export default function HowItWorksSlide() {
  return (
    <div>
      <div className="flex items-end justify-between gap-10">
        <div>
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 max-w-3xl font-display text-6xl font-medium leading-[1.05] tracking-tight">
            From an idea to a fullscreen deck.
          </h2>
        </div>
        <p className="max-w-xs text-right font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-deck-muted">
          Three steps
          <br />
          start to finish
        </p>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4">
        {STEPS.map(({ icon: Icon, k, d }, index) => (
          <div
            key={k}
            className="relative overflow-hidden rounded-2xl border border-deck-surface bg-deck-surface/30 p-6"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl border border-deck-surface bg-deck-bg/60 text-deck-accent">
                <Icon className="size-5" />
              </span>
              <span className="font-display text-4xl font-medium text-deck-surface">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-6 font-display text-3xl font-medium">{k}</p>
            <p className="mt-3 font-body text-lg leading-relaxed text-deck-muted">
              {d}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-deck-accent/20 bg-deck-accent/5 px-5 py-4">
        <span className="size-1.5 shrink-0 rounded-full bg-deck-accent" />
        <p className="font-body text-base text-deck-muted">
          That&apos;s the whole workflow. Everything else is optional.
        </p>
      </div>
    </div>
  );
}
