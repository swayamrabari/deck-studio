# pptxgen

A **code-first presentation platform**. Users log in, create decks in the
browser through a code-editor interface, author slides as React components
in a Next.js-style project structure — and present from the same app.
No export pipeline, ever.

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** engine complete (Phases 0–2: design system + slide engine
core). The platform pivot is locked in — auth, dashboard, browser editor,
and the sandboxed deck runtime are on the roadmap in
**[PLAN.md](./PLAN.md)**.

## Quick start

```bash
npm install
npm run dev
```

| Route | Purpose | Status |
| --- | --- | --- |
| `/style` | Design system specimen — tokens, primitives, all 8 fonts | ✅ |
| `/` | Local deck overview (transitional → landing/dashboard, Phase 3) | ✅ |
| `/present` | Local presenter stub (transitional → `/decks/[id]/present`) | ✅ stub |
| `/login` · `/decks` · `/decks/[id]/edit` · `/decks/[id]/present` | Platform surfaces | Phase 3+ |

## The model

Decks are authored like Next.js apps: `deck/layout.tsx` wraps every slide,
one `NN-name/page.tsx` per slide, `deck/components/` for reusable parts.
On the platform this structure lives in the database and the browser
editor's file tree — compiled and rendered by a sandboxed in-browser
runtime (transpile → virtual modules → iframe), with the studio design
system providing every piece of chrome.

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
