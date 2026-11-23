import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: "Why code",
  notes: "Each point is data mapped to markup — no text boxes were dragged.",
};

const POINTS = [
  {
    k: "HMR",
    d: "Edit a slide in your editor — the app hot-reloads it in place, keeping your position.",
  },
  {
    k: "React",
    d: "Loops, conditionals, hooks, live data. Slides are components like any other page.",
  },
  {
    k: "Git",
    d: "Decks are diffable, reviewable, and reusable across projects.",
  },
  {
    k: "Tokens",
    d: "Fonts, colors, and layouts come from config and shared primitives — one line swaps the type system.",
  },
];

export default function WhyCodeSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-deck-bg px-24 text-deck-fg">
      <p className="font-mono text-sm uppercase tracking-[0.35em] text-deck-muted">
        02 · the case
      </p>
      <h2 className="mt-4 font-display text-6xl font-medium tracking-tight">
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
