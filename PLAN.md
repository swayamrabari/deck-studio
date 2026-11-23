# PLAN — pptxgen · Code-First Presentation Engine

> **The app IS the presentation.** Slides are ordinary React components styled
> with Tailwind/CSS — built exactly the way we build app pages — presented
> through a first-class, in-app presenter. No export pipeline, ever.

*Working name `pptxgen` — kept from the folder. Ironic, since this project
never generates a `.pptx`. Rename freely; nothing depends on the name.*

---

## 1 · Vision

One deck = one Next.js repo. You author slides as React components using a
reusable library of layouts and content primitives, and you present them with
the app's own presenter instead of exporting anything.

- **Code is the source of truth.** Decks live in git: diffable, refactorable,
  reusable across decks, data-driven. Full React power — loops, conditionals,
  custom hooks, even live data fetching inside a slide.
- **HMR is the editing loop.** `npm run dev`, tweak a slide in your editor, and
  watch it update live in the present window without losing your place.
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
| UI kit | **shadcn/ui** (Base UI primitives, `nova` style, neutral base) |
| App chrome mode | **Always dark studio** — one monochrome palette, no mode switching |
| Font roster | **8 families** — sans / display / serif / mono (config-driven slots) |

---

## 3 · Design language ("studio")

Two principles, enforced by architecture:

1. **"Chrome recedes, content leads."** Every tool surface (overview,
   presenter, speaker console, dialogs) is a grayscale studio. The deck is
   the only thing on screen with color and personality.
2. **One token system, two namespaces.** Chrome reads shadcn semantic tokens
   (`bg-background`, `text-muted-foreground`, …); deck content reads
   `--deck-*` tokens. Never mixed — consistency from buttons to dialogs is
   structural, not aspirational.

**Studio chrome spec**

- Neutral grays only (`oklch`): background `0.13`, card/popover `0.175`,
  secondary/muted `0.21`, accent `0.235`, border `1 0 0 / 10%`.
- Depth via hairlines and contrast, never hue or elevation. Primary action =
  inverted (near-white on dark). Destructive is the single conventional
  exception.
- Type: Geist (`font-sans`, `font-heading`), Geist Mono for chrome code
  (`font-ui-mono`), 11px uppercase tracked micro-labels, tabular numerals for
  counters/timers.
- `dark:` variants stay inert by design (`.dark` class never applied) —
  the `:root` palette is the one and only palette.

**Font system**

- `lib/fonts.ts` — the registry: **Geist, Inter, Space Grotesk, Source Serif 4,
  Playfair Display, Fraunces, JetBrains Mono, Geist Mono** (all next/font,
  self-hosted; browsers only download applied families). Any Google font or
  local file = one registry entry.
- `deck.config.ts → fonts: { display, body, mono }` picks registry keys;
  the root layout maps semantic vars (`--deck-font-*`) onto them.
- Slides use only semantic utilities: `font-display`, `font-body`,
  `font-mono`. Swapping a deck's entire type system = one config line.

**Consistency enforcement:** the `/style` specimen page renders every token,
every primitive, and all 8 font specimens — the checkable source of truth and a
visual regression fixture. Chrome surfaces consume only `components/ui/*`
primitives (Button, Dialog, Tooltip, Badge, Progress, Separator, Kbd).

---

## 4 · Scope

### v1 — core product

| Area | What it means |
| --- | --- |
| Design system | shadcn/ui (Base UI), dark-only studio palette, 8-family font registry, `/style` specimen page |
| Slide engine | Fixed logical canvas (1280×720 @ 16:9, configurable), auto-scaled to any screen via `transform: scale()` — authored once, identical everywhere |
| Slide authoring | One file per slide in `slides/` (`01-title.tsx`, …), ordered manifest, per-slide `meta` (title, notes, transition override) |
| Reusable layouts | `TitleSlide`, `SectionSlide`, `Statement`, `TwoColumn`, `Grid`, `FullBleed` |
| Content components | `Bullets`, `CodeBlock`, `Quote`, `Stat`/`KpiRow`, `Table`, `FitImage` |
| Reveal steps | `<Appear>` fragments, auto step-discovery, presenter advances step-by-step |
| Presenter `/present` | Fullscreen, keyboard + touch nav, transitions, progress bar, counter, overview grid overlay, blank screens, URL-synced position |
| Speaker view `/speaker` | Dual-window: current + next slide, notes, timer, clock — synced via `BroadcastChannel`, remote-controllable |
| Deck overview `/` | Grid of live-rendered thumbnails, click any slide → present from it |
| Theming | Deck presets: dark `midnight`, light `paper` (chrome stays studio-dark regardless) |
| Docs & help | In-app `?` shortcuts overlay + authoring guide (README) |

### v1.x

- Manifest auto-sync script (`scripts/sync-slides.mjs`)
- Drag-to-reorder UI (v1 reorders by renaming files / editing the manifest)
- Auto-play mode, per-deck footer/logo chrome, more deck themes
- Content extras: charts, Mermaid diagrams, KaTeX math, media embeds

### Explicitly out of scope

- ❌ PPTX / PDF / image export
- ❌ WYSIWYG drag-and-drop editor — this is a *code-first* tool
- ❌ MDX / DSL authoring — React + Tailwind only
- ❌ Auth, database, collaboration, cloud storage, multi-user anything

---

## 5 · The authoring model (DX promise)

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
4. `<Slide>` provides the semantic frame (bg, padding zones, slide-number
   chrome); bare JSX is also allowed for fully custom slides.
5. Reveal steps: wrap anything in `<Appear>` — the presenter discovers the
   step count automatically and steps through before advancing slides.
6. Typography: slides use the config-driven semantic utilities
   (`font-display`, `font-body`, `font-mono`) — never raw family names, so
   deck fonts swap via `deck.config.ts` only.

**Deck-wide config** lives in `lib/deck.config.ts` (title, aspect, theme,
default transition, slide numbers, font slots). Types live in `lib/types.ts`.

---

## 6 · Routes & controls

| Route | Purpose |
| --- | --- |
| `/` | Deck overview: live thumbnail grid, jump-to-present, deck meta |
| `/present` | Presentation mode — fullscreen slide, all keyboard control |
| `/speaker` | Speaker console — second window, follows the presenter via `BroadcastChannel` |
| `/style` | Design system specimen — tokens, primitives, all 8 font specimens |

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

## 7 · Architecture

### Stack (as in use)

- **Next.js 16.4** (App Router, Turbopack) + **React 19.3** + **TypeScript**
- **Tailwind CSS 4.3** (CSS-first `@theme` tokens)
- **shadcn/ui** — Base UI primitives, `nova` style, neutral base; components:
  button, dialog, tooltip, badge, progress, separator, kbd (+ `lucide-react`
  icons, `cva`, `cn`, `tw-animate-css`)
- **Fonts:** next/font self-hosted — 8-family registry wired via CSS vars
- *Planned deps, added in their phases:* `motion` (framer-motion) — Phase 5 ·
  `prism-react-renderer` — Phase 4 (shiki as a later upgrade path)
- No backend, no database. State = URL + `BroadcastChannel`; content = code.

### Structure (current ✅ and planned)

```
app/
  layout.tsx            # font registry vars + deck font slots + TooltipProvider ✅
  globals.css           # studio palette (dark-only) + deck tokens + font slots ✅
  style/page.tsx        # /style specimen — tokens, primitives, fonts        ✅
  page.tsx              # → deck overview grid                                (Phase 2)
  present/page.tsx      # → presentation mode                                 (Phase 3)
  speaker/page.tsx      # → speaker console                                    (Phase 6)
components/
  ui/                   # shadcn kit (Base UI) — the chrome primitives       ✅
    button · dialog · tooltip · badge · progress · separator · kbd
  slides/               # THE reusable deck library (product's heart)
    Slide.tsx           #   semantic frame: bg, zones, numbers               (Phase 4)
    layouts/            #   TitleSlide, TwoColumn, Grid, …                   (Phase 4)
    content/            #   Bullets, CodeBlock, Stat, …                       (Phase 4)
    motion/             #   Appear, stagger helpers                           (Phase 5)
    index.ts            #   public barrel
  presenter/            # PresenterShell, ProgressBar, overlays                (Phases 3,6,7)
  deck/                 # DeckProvider, useDeck, scaled canvas                (Phase 2)
lib/
  types.ts              # SlideMeta, DeckConfig, SlideModule, DeckFonts      ✅
  deck.config.ts        # deck-wide settings incl. font slots                 ✅
  fonts.ts              # 8-family registry + semantic var mapping            ✅
  utils.ts              # cn (shadcn)                                         ✅
  hooks/                # useKeyboard, useFullscreen, …                      (Phase 3+)
slides/
  index.ts              # ordered manifest                                    ✅ (empty)
  01-title.tsx …        # the deck itself                                     (Phase 2+)
scripts/
  sync-slides.mjs       # manifest auto-generation                            (v1.x)
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
6. **Config-driven fonts** — registry → semantic vars on `<html>` →
   `font-display/body/mono` utilities. Verified working at runtime.

### Dev workflow (the daily loop)

`npm run dev` → edit a slide in your editor → HMR updates the present /
overview window in place, staying on the current slide → `F` to sanity-check
fullscreen.

---

## 8 · Build phases

| # | Phase | Deliverable | Status |
| --- | --- | --- | --- |
| 0 | Foundation | Scaffold, structure, deck config, types, deck tokens | ✅ done |
| 1 | Design foundation | shadcn init (base-nova, neutral), dark-only studio palette, font registry + config mapping, UI kit, `/style` page | ✅ done |
| 2 | Slide engine | Scaled canvas, manifest wiring, 3 demo slides, `/` overview grid | ⬜ |
| 3 | Presenter v1 | `/present`, keyboard nav, fullscreen, URL sync, progress UI, fade — *walking skeleton: end-to-end presenting works* | ⬜ |
| 4 | Component library | All layouts + content components, CodeBlock highlighting, polished default deck theme | ⬜ |
| 5 | Reveal steps | `<Appear>` fragments, step-aware nav, staggered bullets, slide/zoom transitions + overrides | ⬜ |
| 6 | Speaker experience | `/speaker` console (notes, next preview, timer), BroadcastChannel sync, blank screens, `?` help | ⬜ |
| 7 | Polish | Overview overlay, slide numbers, deck theme presets, authoring guide, Playwright smoke test | ⬜ |
| 8 | Content extras | Charts, Mermaid, KaTeX, media embeds — theme-styled, shippable in any order | ⬜ |

**Phase 1 — what exists today (2026-11-23)**

- shadcn/ui initialized (`base-nova`, neutral base, Base UI primitives) with
  Button, Dialog, Tooltip, Badge, Progress, Separator, Kbd in `components/ui/`
- `app/globals.css`: single always-dark studio palette (`.dark` never applied,
  `dark:` variants inert by design), deck tokens separate, font slots mapped
- `lib/fonts.ts`: 8-family registry; `deck.config.ts` picks
  Space Grotesk / Inter / JetBrains Mono for display/body/mono; layout maps
  semantic vars → utilities
- `/style` specimen page: studio surfaces, deck palette, chrome type, all 8
  font specimens, semantic slots demo, every primitive in every state
- Runtime-verified: fonts resolve per config, monochrome palette active,
  zero console errors

---

## 9 · Next step

**Phase 2 — slide engine**: the scaled 16:9 canvas component, manifest
wiring (`DeckProvider`), three demo slides to prove the model, and the
`/` overview grid rendering live thumbnails — all built from the UI kit.
