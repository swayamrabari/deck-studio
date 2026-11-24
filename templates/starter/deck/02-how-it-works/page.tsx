import type { SlideMeta } from "@/lib/types";
import {
  FileCodeIcon,
  LayersIcon,
  PaletteIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "How it works",
  notes: "The Next-shaped file contract behind every deck.",
};

const PARTS = [
  {
    icon: LayersIcon,
    file: "layout.tsx",
    k: "The frame",
    d: "Wraps every slide. Set the title, footer, and spacing once.",
  },
  {
    icon: FileCodeIcon,
    file: "NN-name/page.tsx",
    k: "One slide",
    d: "A React component. Add text, images, icons, and data.",
  },
  {
    icon: PaletteIcon,
    file: "styles.css",
    k: "The look",
    d: "Colors, fonts, and reusable classes live here.",
  },
];

export default function HowItWorksSlide() {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-deck-muted">
        How it works
      </p>
      <h2 className="mt-4 font-display text-5xl font-medium leading-tight tracking-tight">
        Three files. The whole deck.
      </h2>

      <div className="mt-14 grid grid-cols-3 gap-10">
        {PARTS.map(({ icon: Icon, file, k, d }) => (
          <div key={k} className="border-t border-deck-surface pt-5">
            <div className="flex items-center justify-between text-deck-muted">
              <span className="font-mono text-[11px]">{file}</span>
              <Icon className="size-4" />
            </div>
            <p className="mt-7 font-display text-2xl font-medium">{k}</p>
            <p className="mt-2 font-body text-base leading-relaxed text-deck-muted">
              {d}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-deck-muted">
        Edit a page → preview updates → present fullscreen
      </p>
    </div>
  );
}
