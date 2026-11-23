# pptxgen

A **code-first presentation platform**. Users log in, create decks in the
browser through a code-editor interface, author slides as React components
in a Next.js-style project structure — and present from the same app.
No export pipeline, ever.

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** Phases 0–8 complete — log in → create a deck → code it with
live preview (config-driven theme/aspect/fonts, media uploads) → present
fullscreen with reveal steps. Full scope, architecture, and roadmap in
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
| `/decks/[id]/edit` | Workspace — file tree, media, CodeMirror 6, autosave, **live preview** | ✅ |
| `/decks/[id]/present` | Hosted presenter — keyboard, fullscreen, `?s=`/`?st=` deep links, progress, fades, reveal steps | ✅ |
| `/style` | Design system specimen — tokens, primitives, all 8 fonts | ✅ |
| `/present` | Local presenter stub (transitional) | ✅ stub |

## The model

Decks are authored like Next.js apps: `deck/layout.tsx` wraps every slide,
one `NN-name/page.tsx` per slide, `deck/components/` for reusable parts.
The platform stores this structure in the database; the browser editor
shows it as a file tree and a sandboxed in-browser runtime compiles and
renders it (transpile → virtual modules → iframe).

### Config

`deck/deck.config.ts` drives the runtime: `aspect` (`16:9` → 1280×720,
`4:3` → 960×720), `theme` (`midnight` | `paper`), `fonts` (`display` /
`body` / `mono` chosen from the 8-family registry), and `slideNumbers`
(passed to your `layout.tsx`).

### Media

Upload images from the workspace (`+` → **Upload media…**) — they appear
under a `media` folder with preview and delete, stored in the database
and served per deck. Use them in any slide:

```tsx
import { FitImage, media } from "@/components/slides";

<FitImage src={media("cover.jpg")} caption="Uploaded image" />;
```

### Styles

`deck/styles.css` holds reusable plain-CSS classes, injected into the
preview/presenter frame. Deck theme variables work there
(`var(--color-deck-muted)`, `var(--font-display)`, …).

```css
.eyebrow {
  font-family: var(--font-mono);
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--color-deck-muted);
}
```

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
