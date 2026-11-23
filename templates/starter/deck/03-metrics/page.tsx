import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: "By the numbers",
  notes: "Every stat is a mapped object — data-driven slides for free.",
};

const STATS = [
  { value: "0", label: "PPTX files exported" },
  { value: "1", label: "Next.js-shaped folder per deck" },
  { value: "2", label: "Namespaces: studio vs deck" },
  { value: "∞", label: "Slides you can write" },
];

export default function MetricsSlide() {
  return (
    <div className="flex flex-col justify-center">
      <h2 className="font-display text-6xl font-medium tracking-tight">
        By the numbers
      </h2>
      <div className="mt-16 grid grid-cols-4 gap-8">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-display text-7xl font-medium tracking-tight">
              {stat.value}
            </p>
            <p className="mt-3 font-mono text-sm leading-snug text-deck-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
