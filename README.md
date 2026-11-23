# pptxgen

A **code-first presentation platform**. Users log in, create decks in the
browser through a code-editor interface, author slides as React components
in a Next.js-style project structure — and present from the same app.
No export pipeline, ever.

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** Phases 0–9 complete — log in → create a deck → code it with
live preview → present fullscreen with reveal steps and a synced speaker
console. Full scope, architecture, and roadmap in
**[PLAN.md](./PLAN.md)**.

## Quick start

```bash
npm install
npm run dev
```

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Landing (redirects to your decks when signed in) | ✅ |
| `/login` · `/signup` | Token auth (email + password) | ✅ |
| `/decks` | Dashboard — your decks, New deck (starter template) | ✅ |
| `/decks/[id]/edit` | Workspace — file tree, CodeMirror 6, autosave, **live preview** (sandboxed in-browser runtime) | ✅ |
| `/decks/[id]/present` | Hosted presenter — keyboard, fullscreen, `?s=`/`?st=` deep links, progress, fades, reveal steps | ✅ |
| `/decks/[id]/presenter` | Speaker console — previews, notes, timer, two-way sync | ✅ |
| `/style` | Design system specimen — tokens, primitives, all 8 fonts | ✅ |
| `/present` | Local presenter stub (transitional → `/decks/[id]/present`) | ✅ stub |
| `/decks/[id]/present` | Hosted presenter | Phase 6 |

## The model

Decks are authored like Next.js apps: `deck/layout.tsx` wraps every slide,
one `NN-name/page.tsx` per slide, `deck/components/` for reusable parts.
On the platform this structure lives in the database and the browser
editor's file tree — compiled and rendered by a sandboxed in-browser
runtime (transpile → virtual modules → iframe), with the studio design
system providing every piece of chrome.

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
