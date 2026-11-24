import type { SlideMeta } from "@/lib/types";
import {
  MonitorPlayIcon,
  PencilIcon,
  PlayIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "Welcome",
  notes: "A short introduction to what this app does.",
};

export default function TitleSlide() {
  return (
    <div className="max-w-4xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-deck-muted">
        Welcome
      </p>

      <h1 className="mt-6 font-display text-7xl font-medium leading-[1.04] tracking-tight">
        Presentations,
        <br />
        written clearly.
      </h1>

      <p className="mt-7 max-w-2xl font-body text-xl leading-relaxed text-deck-muted">
        A deck is a folder of small pages. Write, preview, and present without
        leaving the app.
      </p>

      <div className="mt-10 flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.2em] text-deck-muted">
        <span className="flex items-center gap-2">
          <PencilIcon className="size-3.5" />
          Write
        </span>
        <span className="flex items-center gap-2">
          <MonitorPlayIcon className="size-3.5" />
          Preview
        </span>
        <span className="flex items-center gap-2">
          <PlayIcon className="size-3.5" />
          Present
        </span>
      </div>
    </div>
  );
}
