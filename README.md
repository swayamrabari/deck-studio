# pptxgen

A **code-first presentation engine** on Next.js. Slides are React components
styled with Tailwind — and instead of any export pipeline, the app ships its
own presenter (fullscreen mode, speaker console, reveal steps).

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** Phases 0–2 complete (foundation, design system, slide engine).
Full scope, architecture, and roadmap live in **[PLAN.md](./PLAN.md)**.

## Quick start

```bash
npm install
npm run dev
```

| Route | Purpose | Status |
| --- | --- | --- |
| `/style` | Design system specimen — tokens, primitives, all 8 fonts | ✅ |
| `/` | Deck overview — live thumbnails, click any slide to preview | ✅ |
| `/present` | Presenter shell — scaled canvas, on-screen nav (keyboard/fullscreen next phase) | ✅ stub |
| `/speaker` | Speaker console (notes, timer, sync) | Phase 6 |

## Design language

Always-dark, monochrome **studio** chrome (shadcn/ui on Base UI — buttons,
dialogs, tooltips, keys — all from one token set), with a separate
**deck palette** reserved for slide content. The deck's typography is
config-driven: 8 curated families (Geist, Inter, Space Grotesk, Source
Serif 4, Playfair Display, Fraunces, JetBrains Mono, Geist Mono) mapped to
semantic slots in `lib/deck.config.ts` — swap a deck's entire type system
in one line. See it all at **`/style`**.

## Authoring (live now)

Slides live in `slides/` — one file per slide, plain React + Tailwind.
The demo deck (`01-title.tsx`, `02-why-code.tsx`, `03-metrics.tsx`)
dogfoods the app: it pitches the engine it runs on. Order is defined by
the manifest in `slides/index.ts`. The engine component library
(`TwoColumn`, `Bullets`, `Stat`, …) lands in Phase 5.

**Planned (Phase 4):** authoring moves into an App Router-shaped `deck/`
folder — `deck/layout.tsx` wrapping every slide (like a root layout),
`deck/components/` for reusable deck-local components, and one
`NN-name/page.tsx` per slide. If you know Next.js, you already know how
to write a deck. Details in [PLAN.md](./PLAN.md).
