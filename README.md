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
**none of the app's CSS**. The iframe body, frame, canvas, and stage are
styled by active, editable rules at the top of the deck's own
`styles.css`; the platform supplies no visual defaults and no canvas
stylesheet. Tailwind utilities are compiled inside the frame from deck
code, so app chrome and deck styles share no stylesheet and cannot
overlap.

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

`deck/styles.css` is the deck's visual source of truth. The frame itself
— `html`, `body`, `.deck-frame`, `.deck-canvas`, `.deck-canvas-stage` —
is written as **active, editable CSS at the top of that file** (marked
`@deck-base`). The platform injects no background, color, border, type,
or canvas stylesheet. Edit or delete those rules like any other CSS:

```css
/* @deck-base:start — this is the deck's frame. Edit it freely. */
html,
body { height: 100%; margin: 0; }
body { overflow: hidden; background: #000; }

.deck-frame { position: relative; width: 100%; height: 100dvh; }
.deck-canvas { position: relative; width: 100%; height: 100%; overflow: hidden; }
.deck-canvas-stage {
  overflow: hidden;
  background: var(--color-deck-bg);
  color: var(--color-deck-fg);
}
/* @deck-base:end */
```

**Rebranding** works by overriding the deck tokens or the frame rules
directly; this file loads after the deck config tokens, so it wins:

```css
:root {
  --color-deck-bg: #0a0a0a;
  --color-deck-fg: #f5f5f5;
  --color-deck-accent: #ff5c00;
}

.eyebrow { font-family: var(--font-mono); letter-spacing: 0.35em; }
```

Every deck has this file. Older decks get the `@deck-base` block
prepended once when opened, and the runtime accepts any top-level
`deck/*.css` as well.

### Formatting

Prettier runs in the browser: **Shift+Alt+F**, the format button in the
tab strip, or automatically after a paste. Supports TSX/TS/JS and CSS
with the studio's code style (2 spaces, double quotes, semicolons,
trailing commas). Invalid syntax is left untouched.

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
