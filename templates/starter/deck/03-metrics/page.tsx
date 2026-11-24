import type { SlideMeta } from "@/lib/types";
import {
  FileX as FileXIcon,
  FolderTree as FolderTreeIcon,
  Infinity as InfinityIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "By the numbers",
  notes: "Every stat is a mapped object — data-driven slides for free.",
};

const STATS = [
  {
    icon: FileXIcon,
    value: "0",
    label: "PPTX files",
    hint: "the export pipeline is gone",
  },
  {
    icon: FolderTreeIcon,
    value: "1",
    label: "folder per deck",
    hint: "layout, pages, components",
  },
  {
    icon: InfinityIcon,
    value: "∞",
    label: "slides",
    hint: "write as many as you need",
  },
  {
    icon: SlidersHorizontalIcon,
    value: "100%",
    label: "your control",
    hint: "styles live in deck/styles.css",
  },
];

export default function MetricsSlide() {
  return (
    <div>
      <div className="flex items-end justify-between gap-10">
        <div>
          <p className="eyebrow">Engine facts</p>
          <h2 className="mt-4 font-display text-6xl font-medium leading-[1.05] tracking-tight">
            By the numbers
          </h2>
        </div>
        <span className="rounded-full border border-deck-surface px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted">
          data → markup
        </span>
      </div>

      <div className="mt-12 grid grid-cols-4 gap-4">
        {STATS.map(({ icon: Icon, value, label, hint }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-2xl border border-deck-surface bg-deck-surface/30 p-6"
          >
            <Icon className="size-5 text-deck-accent" />
            <p className="mt-9 font-display text-6xl font-medium tracking-tight">
              {value}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-deck-muted">
              {label}
            </p>
            <p className="mt-1.5 font-body text-sm leading-snug text-deck-muted/70">
              {hint}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-xl border border-deck-accent/20 bg-deck-accent/5 px-5 py-4">
        <SparklesIcon className="size-4 shrink-0 text-deck-accent" />
        <p className="font-body text-base text-deck-muted">
          Every value above is a React expression — swap it for your own data.
        </p>
      </div>
    </div>
  );
}
