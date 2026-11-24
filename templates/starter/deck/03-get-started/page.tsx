import type { SlideMeta } from "@/lib/types";
import {
  FilePlusIcon,
  ImageIcon,
  PaletteIcon,
  PencilIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "Get started",
  notes: "The handful of actions that make the deck yours.",
};

const MOVES = [
  {
    icon: FilePlusIcon,
    k: "Add a slide",
    d: "Open the + menu, choose New slide, and give it a name.",
  },
  {
    icon: PencilIcon,
    k: "Rename a slide",
    d: "Hover a slide folder and click the pencil. Its number stays.",
  },
  {
    icon: ImageIcon,
    k: "Add images",
    d: "Upload from the + menu, then place the image on any slide.",
  },
  {
    icon: PaletteIcon,
    k: "Style the deck",
    d: "Colors, fonts, and spacing live together in deck/styles.css.",
  },
  {
    icon: SparklesIcon,
    k: "Add icons",
    d: "Lucide icons are built in. Use them to give ideas a visual cue.",
  },
  {
    icon: RotateCcwIcon,
    k: "Start fresh",
    d: "Want a clean slate? + → Start fresh keeps one editable slide.",
  },
];

export default function GetStartedSlide() {
  return (
    <div>
      <div className="flex items-end justify-between gap-10">
        <div>
          <p className="eyebrow">Make it yours</p>
          <h2 className="mt-4 font-display text-6xl font-medium leading-[1.05] tracking-tight">
            A few moves to get started.
          </h2>
        </div>
        <span className="rounded-full border border-deck-surface px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted">
          your deck, your rules
        </span>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {MOVES.map(({ icon: Icon, k, d }) => (
          <div
            key={k}
            className="rounded-2xl border border-deck-surface bg-deck-surface/30 p-4"
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-deck-surface bg-deck-bg/60 text-deck-accent">
              <Icon className="size-4" />
            </span>
            <p className="mt-3 font-display text-lg font-medium">{k}</p>
            <p className="mt-1.5 font-body text-sm leading-snug text-deck-muted">
              {d}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-deck-accent/20 bg-deck-accent/5 px-5 py-3.5">
        <PaletteIcon className="size-4 shrink-0 text-deck-accent" />
        <p className="font-body text-base text-deck-muted">
          Change the deck&apos;s colors and fonts in{" "}
          <span className="font-mono text-sm text-deck-fg">
            deck/styles.css
          </span>{" "}
          — every slide follows.
        </p>
      </div>
    </div>
  );
}
