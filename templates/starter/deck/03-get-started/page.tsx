import type { SlideMeta } from "@/lib/types";
import {
  FilePlusIcon,
  ImageIcon,
  PaletteIcon,
  PencilIcon,
  RotateCcwIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "Get started",
  notes: "The handful of actions that make the deck yours.",
};

const MOVES = [
  {
    icon: FilePlusIcon,
    k: "Add a slide",
    d: "+ → New slide creates deck/NN-name/page.tsx.",
  },
  {
    icon: PencilIcon,
    k: "Rename a slide",
    d: "Hover its folder and click the pencil.",
  },
  {
    icon: ImageIcon,
    k: "Add images",
    d: "Upload, then use media(\"photo.jpg\") in the page.",
  },
  {
    icon: PaletteIcon,
    k: "Style the deck",
    d: "Change colors, fonts, and classes in deck/styles.css.",
  },
  {
    icon: RotateCcwIcon,
    k: "Start fresh",
    d: "Clear the tour and keep one clean page.",
  },
];

export default function GetStartedSlide() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-deck-muted">
        Get started
      </p>
      <h2 className="mt-4 font-display text-5xl font-medium leading-tight tracking-tight">
        A few moves.
      </h2>

      <div className="mt-10 divide-y divide-deck-surface border-y border-deck-surface">
        {MOVES.map(({ icon: Icon, k, d }) => (
          <div key={k} className="flex items-center gap-6 py-4">
            <Icon className="size-4 shrink-0 text-deck-muted" />
            <p className="w-44 shrink-0 font-display text-xl font-medium">
              {k}
            </p>
            <p className="font-body text-base text-deck-muted">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
