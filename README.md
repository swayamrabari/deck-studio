# pptxgen

A **code-first presentation engine** on Next.js. Slides are React components
styled with Tailwind — and instead of any export pipeline, the app ships its
own presenter (fullscreen mode, speaker console, reveal steps).

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** Phase 0 (foundation) complete. Full scope, architecture, and
roadmap live in **[PLAN.md](./PLAN.md)**.

## Quick start

```bash
npm install
npm run dev
```

| Route | Purpose | Phase |
| --- | --- | --- |
| `/` | Deck overview — live thumbnail grid | 1 |
| `/present` | Presentation mode | 2 |
| `/speaker` | Speaker console (notes, timer, sync) | 5 |

## Authoring (preview)

Slides live in `slides/` — one file per slide, plain React + Tailwind:

```tsx
// slides/01-title.tsx
export const meta = { title: "Hello" };

export default function () {
  return <h1 className="text-6xl font-bold">Hello, deck.</h1>;
}
```

Order is defined by the manifest in `slides/index.ts`. The full component
library (`Slide`, `TitleSlide`, `TwoColumn`, `Bullets`, `Stat`, …) lands in
Phase 3 — see [PLAN.md](./PLAN.md) for the complete model.
