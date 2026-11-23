import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: "By the numbers",
  notes: "Every stat is a mapped object — data-driven slides for free.",
};

const STATS = [
  { value: "0", label: "PPTX files exported" },
  { value: "8", label: "Font families, one config line" },
  { value: "2", label: "Token namespaces: studio vs deck" },
  { value: "1:1", label: "What you author is what you present" },
];

export default function MetricsSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-deck-bg px-24 text-deck-fg">
      <p className="font-mono text-sm uppercase tracking-[0.35em] text-deck-muted">
        03 · proof
      </p>
      <h2 className="mt-4 font-display text-6xl font-medium tracking-tight">
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
