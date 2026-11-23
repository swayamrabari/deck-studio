import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: "Title",
  notes: "Set the frame: this deck is written, not drawn. One repo, one Next app.",
};

export default function TitleSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-deck-bg px-24 text-deck-fg">
      <p className="font-mono text-sm uppercase tracking-[0.35em] text-deck-muted">
        pptxgen · demo deck
      </p>
      <h1 className="mt-6 font-display text-8xl font-medium tracking-tight">
        Slides as code.
      </h1>
      <p className="mt-8 max-w-3xl font-body text-2xl leading-relaxed text-deck-muted">
        This presentation is a Next.js app. Every slide is a React
        component, styled with Tailwind, presented by the built-in
        presenter — no exports, ever.
      </p>
      <div className="mt-12 flex items-center gap-4">
        <span className="rounded-full bg-deck-accent px-4 py-1.5 font-mono text-sm text-deck-bg">
          npm run dev
        </span>
        <span className="font-mono text-sm text-deck-muted">
          edit → save → live
        </span>
      </div>
    </div>
  );
}
