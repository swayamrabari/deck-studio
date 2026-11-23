import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: "Why code",
  notes: "Each point is data mapped to markup — no text boxes were dragged.",
};

const POINTS = [
  {
    k: "Live preview",
    d: "Edit a slide — the preview re-renders instantly, in your browser.",
  },
  {
    k: "React",
    d: "Loops, conditionals, hooks, data. Slides are components like any other page.",
  },
  {
    k: "Structure",
    d: "A deck is a Next.js-shaped folder: layout.tsx, pages, and colocated components.",
  },
  {
    k: "Presenter",
    d: "Fullscreen presenting and keyboard control are built in.",
  },
];

export default function WhyCodeSlide() {
  return (
    <div className="flex flex-col justify-center">
      <h2 className="font-display text-6xl font-medium tracking-tight">
        Why author slides in code?
      </h2>
      <ul className="mt-12 space-y-6">
        {POINTS.map((point, i) => (
          <li key={point.k} className="flex items-baseline gap-6">
            <span className="w-16 shrink-0 font-mono text-sm text-deck-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="font-display text-2xl font-medium">{point.k}</p>
              <p className="mt-1 max-w-2xl font-body text-xl text-deck-muted">
                {point.d}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
