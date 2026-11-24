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
| `/decks/[id]/edit` | Workspace — file tree, media, CodeMirror 6, autosave, **live preview**, **resizable panes** | ✅ |
| `/decks/[id]/present` | Hosted presenter — keyboard, fullscreen, `?s=`/`?st=` deep links, progress, fades, reveal steps | ✅ |
| `/style` | Design system specimen — tokens, primitives, all 8 fonts | ✅ |
| `/present` | Local presenter stub (transitional) | ✅ stub |

## The model

Decks are authored like Next.js apps: `deck/layout.tsx` wraps every slide,
one `NN-name/page.tsx` per slide, `deck/components/` for reusable parts.
The platform stores this structure in the database; the browser editor
shows it as a file tree and a sandboxed in-browser runtime compiles and
renders it (transpile → virtual modules → iframe).

**Full CSS isolation:** the runtime runs in its own root layout with
**none of the app's CSS**. The frame contributes only structure — no
background, color, border, or type — and deck Tailwind is compiled
inside the frame. `deck/styles.css` paints the deck and can target the
stable hooks `.deck-frame`, `.deck-canvas`, and `.deck-canvas-stage`, so
app chrome and deck styles share no stylesheet and cannot overlap.

### Config

`deck/deck.config.ts` drives the runtime: `aspect` (`16:9` → 1280×720,
`4:3` → 960×720), `theme` (`midnight` | `paper`), `fonts` (`display` /
`body` / `mono` from the 14-family registry — **case-insensitive**, so
`"sora"`, `"Sora"`, `"fira code"` all work), and `slideNumbers` (passed
to your `layout.tsx`).

### Media

Upload images from the workspace (`+` → **Upload media…**) — they appear
under a `media` folder with preview and delete, stored in the database
and served per deck. Use them in any slide:

```tsx
import { FitImage, media } from "@/components/slides";

<FitImage src={media("cover.jpg")} caption="Uploaded image" />;
```

### Icons

Lucide icons work directly in slide code — `lucide-react` is exposed to
the deck runtime and loaded on demand the first time a deck imports it:

```tsx
import { ArrowRight, Rocket } from "lucide-react";

<Rocket className="size-10 text-deck-accent" />;
```

Decks that don't import icons never download the library. Icons inherit
`currentColor` and accept normal `size-*`, `stroke-*`, and color classes.

### Styles

`deck/styles.css` is the deck's visual source of truth, injected into the
preview/presenter frame. The runtime paints no background, color, border,
or type of its own — the deck owns all of it. **Override the deck tokens
at `:root` to rebrand the whole deck**; user styles load after the theme,
so they win:

```css
:root {
  --color-deck-bg: #0a0a0a;
  --color-deck-fg: #f5f5f5;
  --color-deck-accent: #ff5c00;
}

.deck-canvas-stage {
  background: var(--color-deck-bg);
  color: var(--color-deck-fg);
}

.eyebrow { font-family: var(--font-mono); letter-spacing: 0.35em; }
```

Stable frame hooks: `.deck-frame` (viewport), `.deck-canvas` (measured
box), `.deck-canvas-stage` (the scaled logical slide). Every deck has
`deck/styles.css` (older decks get it backfilled on open), and the runtime
accepts any top-level `deck/*.css` as well.

### Formatting

Prettier runs in the browser: **Shift+Alt+F**, the format button in the
tab strip, or automatically after a paste. Supports TSX/TS/JS and CSS
with the studio's code style (2 spaces, double quotes, semicolons,
trailing commas). Invalid syntax is left untouched.

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
