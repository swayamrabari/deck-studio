# pptxgen

A **code-first presentation engine** on Next.js. Slides are React components
styled with Tailwind — and instead of any export pipeline, the app ships its
own presenter (fullscreen mode, speaker console, reveal steps).

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** Phases 0–1 complete (foundation + design system). Full scope,
architecture, and roadmap live in **[PLAN.md](./PLAN.md)**.

## Quick start

```bash
npm install
npm run dev
```

| Route | Purpose | Phase |
| --- | --- | --- |
| `/style` | Design system specimen — tokens, primitives, all 8 fonts | ✅ live |
| `/` | Deck overview — live thumbnail grid | 2 |
| `/present` | Presentation mode | 3 |
| `/speaker` | Speaker console (notes, timer, sync) | 6 |

## Design language

Always-dark, monochrome **studio** chrome (shadcn/ui on Base UI — buttons,
dialogs, tooltips, keys — all from one token set), with a separate
**deck palette** reserved for slide content. The deck's typography is
config-driven: 8 curated families (Geist, Inter, Space Grotesk, Source
Serif 4, Playfair Display, Fraunces, JetBrains Mono, Geist Mono) mapped to
semantic slots in `lib/deck.config.ts` — swap a deck's entire type system
in one line. See it all at **`/style`**.

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
Phase 4 — see [PLAN.md](./PLAN.md) for the complete model.
