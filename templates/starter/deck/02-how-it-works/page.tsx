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
    d: "Add text, images, and icons to a page.",
  },
  {
    icon: MonitorPlayIcon,
    k: "Preview",
    d: "The right pane updates as you type.",
  },
  {
    icon: PlayIcon,
    k: "Present",
    d: "Go fullscreen and move with the arrow keys.",
  },
];

export default function HowItWorksSlide() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-deck-muted">
        How it works
      </p>
      <h2 className="mt-4 font-display text-5xl font-medium leading-tight tracking-tight">
        Three steps, start to finish.
      </h2>

      <div className="mt-14 grid grid-cols-3 gap-10">
        {STEPS.map(({ icon: Icon, k, d }, index) => (
          <div key={k} className="border-t border-deck-surface pt-5">
            <div className="flex items-center justify-between text-deck-muted">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon className="size-4" />
            </div>
            <p className="mt-7 font-display text-2xl font-medium">{k}</p>
            <p className="mt-2 font-body text-base leading-relaxed text-deck-muted">
              {d}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
