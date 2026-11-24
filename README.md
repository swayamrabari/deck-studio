# pptxgen

A **code-first presentation platform**. Users log in, create decks in the
browser through a code-editor interface, author slides as React components
in a Next.js-style project structure — and present from the same app.
No export pipeline, ever.

> Working name — despite the folder, this project never generates a `.pptx`.

**Status:** Phases 0–8 complete — log in → create a deck → code it with
live preview (CSS-owned styling, config aspect, media uploads) → present
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
| `/decks/[id]/edit` | Workspace — file tree, media, CodeMirror 6, autosave, **live preview**, **resizable panes**, named new slides + slide-folder rename | ✅ |
| `/decks/[id]/present` | Hosted presenter — keyboard, fullscreen, `?s=`/`?st=` deep links, progress, fades, reveal steps | ✅ |
| `/style` | Design system specimen — tokens, primitives, all 14 fonts | ✅ |
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

New decks open with a short user-facing tour — **Welcome**, **How it
works**, **Get started**. To skip it, use **`+` → Start fresh** in the
workspace: it removes the tour slides and leaves one clean slide (layout,
styles, media, and components stay).

### Config

`deck/deck.config.ts` sets behavior only: `aspect` (`16:9` → 1280×720,
`4:3` → 960×720), `defaultTransition`, and `slideNumbers` (passed to your
`layout.tsx`). **There is no theme or font config** — colors, surfaces,
typography, and fonts all live in `deck/styles.css`.

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

`deck/styles.css` is the deck's only visual source. The frame itself —
`html`, `body`, `.deck-frame`, `.deck-canvas`, `.deck-canvas-stage` — is
written as **active, editable CSS at the top of that file**, along with
the deck's palette and font stacks. The platform injects no background,
color, border, type, theme, config, or canvas stylesheet:

```css
/* @deck-base:start v2 — this is the deck's frame and theme. */
:root {
  --deck-bg: #0b0e14;
  --deck-surface: #131826;
  --deck-fg: #e8ecf3;
  --deck-muted: #9aa4b8;
  --deck-accent: #7aa2f7;

  --deck-font-display: "Space Grotesk", system-ui, sans-serif;
  --deck-font-body: "Inter", system-ui, sans-serif;
  --deck-font-mono: "JetBrains Mono", ui-monospace, monospace;
}

.deck-canvas-stage {
  overflow: hidden;
  background: var(--deck-bg);
  color: var(--deck-fg);
}
/* @deck-base:end */
```

Change those variables directly. Fonts are loaded by CSS too (the
starter file starts with a Google Fonts `@import`); swap the import, use
system stacks, or add your own `@font-face`. The engine's Tailwind classes
(`bg-deck-bg`, `font-display`, …) are only aliases for these deck-owned
variables — they contain no palette or font values of their own.

Every deck has this file. Older decks get the `@deck-base` block
prepended once when opened, and the runtime accepts any top-level
`deck/*.css` as well.

### Formatting

Prettier runs in the browser: **Shift+Alt+F**, the format button in the
tab strip, or automatically after a paste. Supports TSX/TS/JS and CSS
with the studio's code style (2 spaces, double quotes, semicolons,
trailing commas). Invalid syntax is left untouched.

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
