import type { SlideMeta } from "@/lib/types";
import {
  FileCodeIcon,
  LayersIcon,
  PaletteIcon,
} from "lucide-react";

export const meta: SlideMeta = {
  title: "Welcome",
  notes: "A short introduction to the deck model.",
};

export default function TitleSlide() {
  return (
    <div className="grid grid-cols-[1.1fr_0.9fr] items-center gap-16">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-deck-muted">
          Welcome
        </p>

        <h1 className="mt-6 font-display text-7xl font-medium leading-[1.04] tracking-tight">
          Slides,
          <br />
          written in React.
        </h1>

        <p className="mt-7 max-w-xl font-body text-xl leading-relaxed text-deck-muted">
          A deck is a folder of React pages. One layout wraps every slide, one
          page defines its content, and a stylesheet owns the look.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-6 font-mono text-[11px] text-deck-muted">
          <span className="flex items-center gap-2">
            <FileCodeIcon className="size-3.5" />
            page.tsx
          </span>
          <span className="flex items-center gap-2">
            <LayersIcon className="size-3.5" />
            layout.tsx
          </span>
          <span className="flex items-center gap-2">
            <PaletteIcon className="size-3.5" />
            styles.css
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-deck-surface bg-deck-surface/20 p-5 font-mono text-xs">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-deck-muted">
          <span>deck/</span>
          <span>01 / 03</span>
        </div>

        <div className="mt-5 space-y-2 text-deck-muted">
          <p className="text-deck-fg">01-welcome/</p>
          <p className="pl-4">page.tsx</p>
          <p>layout.tsx</p>
          <p>styles.css</p>
        </div>

        <div className="mt-5 border-t border-deck-surface pt-4 leading-6 text-deck-muted">
          <p>
            <span className="text-deck-fg">export default</span> function
            Slide() {"{"}
          </p>
          <p className="pl-4">
            <span className="text-deck-fg">return</span> &lt;h1&gt;Hello,
            React&lt;/h1&gt;;
          </p>
          <p>{"}"}</p>
        </div>
      </div>
    </div>
  );
}
