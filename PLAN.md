# PLAN — pptxgen · Code-First Presentation Engine

> **The app IS the presentation.** Slides are ordinary React components styled
> with Tailwind/CSS — built exactly the way we build app pages — presented
> through a first-class, in-app presenter. No export pipeline, ever.

*Working name `pptxgen` — kept from the folder. Ironic, since this project never
generates a `.pptx`. Rename freely; nothing depends on the name.*

---

## 1 · Vision

One deck = one Next.js repo. You author slides as React components using a
reusable library of layouts and content primitives, and you present them with
the app's own presenter instead of exporting anything.

- **Code is the source of truth.** Decks live in git: diffable, refactorable,
  reusable across decks, data-driven. Full React power — loops, conditionals,
  custom hooks, even live data fetching inside a slide.
- **HMR is the editing loop.** `npm run dev`, tweak a slide in your editor, and
  watch it update live in the present window without losing your place. That
  feedback loop is the product's core selling point vs PowerPoint.
- **No export pipeline.** No PPTX, no PDF, no image dumps. The presenter is the
  product.

---

## 2 · Locked decisions

| Decision | Choice |
| --- | --- |
| Deck model | **One deck per project** (this repo = one presentation; Slidev-style) |
| Speaker view | **v1** — dual-window console: notes, next-slide preview, timer, sync |
| Reveal steps | **v1 core** — `<Appear>` fragments with step-aware navigation |
| Content extras roadmap | **Charts (recharts), Mermaid, KaTeX, media embeds** |
| QR codes | Dropped |
| Export | **None.** Not now, not later — presenter only |

---

## 3 · Scope

### v1 — core product

| Area | What it means |
| --- | --- |
| Slide engine | Fixed logical canvas (1280×720 @ 16:9, configurable), auto-scaled to any screen via `transform: scale()` — authored once, identical everywhere |
| Slide authoring | One file per slide in `slides/` (`01-title.tsx`, `02-agenda.tsx`, …), ordered manifest, per-slide `meta` (title, notes, transition override) |
| Reusable layouts | `TitleSlide`, `SectionSlide`, `Statement`, `TwoColumn`, `Grid`, `FullBleed` |
| Content components | `Bullets`, `CodeBlock` (highlighted, line highlighting), `Quote`, `Stat`/`KpiRow`, `Table`, `FitImage` |
| Reveal steps | `<Appear>` fragments, auto step-discovery, presenter advances step-by-step |
| Presenter `/present` | Fullscreen, keyboard + touch nav, transitions (fade/slide/zoom via motion), progress bar, counter, overview grid overlay, blank screens, URL-synced position |
| Speaker view `/speaker` | Dual-window: current + next slide, notes, elapsed timer, clock — synced via `BroadcastChannel`, remote-controllable |
| Deck overview `/` | Grid of live-rendered thumbnails, click any slide → present from it |
| Theming | Tailwind v4 `@theme` tokens (colors, fonts, spacing), presets: dark `midnight`, light `paper` |
| Docs & help | In-app `?` shortcuts overlay + authoring guide (README) |

### v1.x

- Manifest auto-sync script (`scripts/sync-slides.mjs`)
- Drag-to-reorder UI (v1 reorders by renaming files / editing the manifest)
- Auto-play mode, per-deck footer/logo chrome, more theme presets
- Content extras: charts, Mermaid diagrams, KaTeX math, media embeds
  (independently shippable, theme-styled wrappers)

### Explicitly out of scope

- ❌ PPTX / PDF / image export
- ❌ WYSIWYG drag-and-drop editor — this is a *code-first* tool
- ❌ MDX / DSL authoring — React + Tailwind only
- ❌ Auth, database, collaboration, cloud storage, multi-user anything

---

## 4 · The authoring model (DX promise)

A slide is just a React component:

```tsx
// slides/04-metrics.tsx
import { Slide, Bullets, Stat, TwoColumn } from "@/components/slides";

export const meta = {
  title: "Q4 Metrics",
  notes: "Lead with MAU growth, pause on retention.",
};

export default function MetricsSlide() {
  return (
    <Slide layout="center">
      <TwoColumn ratio="1/1">
        <Bullets items={["2.4M MAU (+38%)", "Retention at 71%", "NPS 62"]} />
        <div className="flex gap-8">
          <Stat value="2.4M" label="MAU" />
          <Stat value="71%" label="Retention" />
        </div>
      </TwoColumn>
    </Slide>
  );
}
```

**Rules of the model**

1. One file per slide: `slides/NN-name.tsx` — default-export the component,
   optionally export `meta: SlideMeta`.
2. Deck order = import order in `slides/index.ts` (the manifest).
3. The engine renders each slide inside a fixed 1280×720 canvas and scales it
   to fit — author with px or Tailwind, it looks identical on any screen.
4. `<Slide>` provides the semantic frame (bg, padding zones, slide number
   chrome); bare JSX is also allowed for fully custom slides.
5. Reveal steps: wrap anything in `<Appear>` — the presenter discovers the
   step count automatically and steps through before advancing slides.

**Deck-wide config** lives in `lib/deck.config.ts` (title, aspect, theme,
default transition, slide numbers). Types live in `lib/types.ts`.

---

## 5 · Routes & controls

| Route | Purpose |
| --- | --- |
| `/` | Deck overview: live thumbnail grid, jump-to-present, deck meta |
| `/present` | Presentation mode — fullscreen slide, all keyboard control |
| `/speaker` | Speaker console — second window, follows the presenter via `BroadcastChannel` |

**Presenter keyboard map (v1)**

| Key | Action |
| --- | --- |
| `→` / `Space` / `N` | Next step, then next slide |
| `←` / `P` | Previous |
| `Home` / `End` | First / last slide |
| `F` | Toggle fullscreen |
| `O` / `Esc` | Slide overview grid (arrows + Enter to jump) |
| `S` | Pop out speaker view |
| `B` / `W` | Black / white attention screen |
| `1-9` + `Enter` | Jump to slide number |
| `?` | Shortcut overlay |

Touch: swipe left/right for prev/next.

---

## 6 · Architecture

### Stack (as scaffolded)

- **Next.js 16.4** (App Router, Turbopack) + **React 19.3** + **TypeScript**
- **Tailwind CSS 4.3** (CSS-first `@theme` tokens)
- **next/font** — Geist Sans + Geist Mono wired via CSS vars
- *Planned deps, added in their phases:* `motion` (framer-motion) — Phase 4 ·
  `prism-react-renderer` — Phase 3 (shiki as a later upgrade path)
- No backend, no database. State = URL + `BroadcastChannel`; content = code.

### Structure (current ✅ and planned)

```
app/
  layout.tsx            # fonts, metadata, global chrome        ✅
  globals.css           # Tailwind v4 + deck theme tokens       ✅
  page.tsx              # → deck overview grid                  (Phase 1)
  present/page.tsx      # → presentation mode                   (Phase 2)
  speaker/page.tsx      # → speaker console                     (Phase 5)
components/
  slides/               # THE reusable library (product's heart)
    Slide.tsx           #   semantic frame: bg, zones, numbers   (Phase 3)
    layouts/            #   TitleSlide, TwoColumn, Grid, …       (Phase 3)
    content/            #   Bullets, CodeBlock, Stat, …          (Phase 3)
    motion/             #   Appear, stagger helpers             (Phase 4)
    index.ts            #   public barrel
  presenter/            # PresenterShell, ProgressBar, overlays  (Phases 2,5,6)
  deck/                 # DeckProvider, useDeck, scaled canvas  (Phase 1)
lib/
  types.ts              # SlideMeta, DeckConfig, SlideModule    ✅
  deck.config.ts        # deck-wide settings                    ✅
  hooks/                # useKeyboard, useFullscreen, …          (Phase 2+)
slides/
  index.ts              # ordered manifest                     ✅ (empty)
  01-title.tsx …        # the deck itself                       (Phase 1+)
scripts/
  sync-slides.mjs       # manifest auto-generation              (v1.x)
```

### Key mechanisms

1. **Scaled canvas** — engine renders slides at fixed 1280×720;
   `ResizeObserver` + `transform: scale()` fit/center them. Pixel-perfect on
   projector, laptop, and phone alike.
2. **Deck state** — `DeckProvider` (context + reducer) holds
   `{ index, step }`. The URL is the source of truth
   (`/present?s=4&st=1` via `history.replaceState`) → refresh-safe,
   shareable deep links. No redux/zustand.
3. **Auto step discovery** — `<Appear>` registers itself via context; the
   slide reports its total step count after render. `next()` steps through
   fragments before advancing slides. Zero manual bookkeeping.
4. **Cross-window sync** — `BroadcastChannel("deck")`; the presenter window is
   authoritative, the speaker view mirrors `{index, step}` and can send
   controls back.
5. **Manifest** — `slides/index.ts` imports each slide module
   (`{ default, meta }`) in order. Explicit, predictable, HMR-friendly.

### Dev workflow (the daily loop)

`npm run dev` → edit a slide in your editor → HMR updates the present /
overview window in place, staying on the current slide → `F` to sanity-check
fullscreen.

---

## 7 · Build phases

| # | Phase | Deliverable | Size | Status |
| --- | --- | --- | --- | --- |
| 0 | Foundation | Scaffold, structure, deck config, types, theme tokens | S | ✅ done |
| 1 | Slide engine | Scaled canvas, manifest wiring, 3 demo slides, `/` overview grid | M | ⬜ |
| 2 | Presenter v1 | `/present`, keyboard nav, fullscreen, URL sync, progress UI, fade — *walking skeleton: end-to-end presenting works* | M | ⬜ |
| 3 | Component library | All layouts + content components, CodeBlock highlighting, polished default theme | L | ⬜ |
| 4 | Reveal steps | `<Appear>` fragments, step-aware nav, staggered bullets, slide/zoom transitions + overrides | M | ⬜ |
| 5 | Speaker experience | `/speaker` console (notes, next preview, timer), BroadcastChannel sync, blank screens, `?` help | M | ⬜ |
| 6 | Polish | Overview overlay, slide numbers, theme presets, authoring guide, Playwright smoke test | S–M | ⬜ |
| 7 | Content extras | Charts, Mermaid, KaTeX, media embeds — theme-styled, shippable in any order | L | ⬜ |

**Phase 0 — what exists today (2026-11-23)**

- Next.js 16.4.6 + React 19.3 + Tailwind 4.3.3 + TypeScript, App Router,
  root-level `app/`, alias `@/*`
- Geist Sans/Mono wired via `next/font`
- `lib/types.ts` (`SlideMeta`, `SlideModule`, `DeckConfig`, transitions),
  `lib/deck.config.ts`, empty `slides/index.ts` manifest with authoring docs
- Deck theme tokens ("midnight" palette: `bg`, `surface`, `fg`, `muted`,
  `accent`) + `--font-display` in `app/globals.css`
- Git repo initialized; this plan doc

---

## 8 · Next step

**Phase 1 — slide engine**: the scaled 16:9 canvas component, manifest
wiring (`DeckProvider`), three demo slides to prove the model, and the
`/` overview grid rendering live thumbnails.
