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
| Deck model | **One deck per app** — the deck is the user-facing unit, never a "project"; this repo = one presentation, Slidev-style |
| Authoring model | **App Router-shaped `deck/`** — `layout.tsx`, `components/`, one `NN-name/page.tsx` per slide (lands Phase 4) |
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
| Slide authoring | App Router-shaped `deck/`: one `NN-name/page.tsx` per slide, `layout.tsx` frame, `components/` locals, ordered manifest, per-slide `meta` (title, notes, transition) |
| Reusable layouts | Engine library (`@/components/slides`): `TitleSlide`, `SectionSlide`, `Statement`, `TwoColumn`, `Grid`, `FullBleed` — used inside `layout.tsx` & `page.tsx` |
| Content components | `Bullets`, `CodeBlock`, `Quote`, `Stat`/`KpiRow`, `Table`, `FitImage` |
| Reveal steps | `<Appear>` fragments, auto step-discovery, presenter advances step-by-step |
| Presenter `/present` | Fullscreen, keyboard + touch nav, transitions, progress bar, counter, overview grid overlay, blank screens, URL-synced position |
| Speaker view `/speaker` | Dual-window: current + next slide, notes, timer, clock — synced via `BroadcastChannel`, remote-controllable |
| Deck overview `/` | Grid of live-rendered thumbnails, click any slide → present from it |
| Theming | Deck presets: dark `midnight`, light `paper` (chrome stays studio-dark regardless) |
| Docs & help | In-app `?` shortcuts overlay + authoring guide (README) |

### v1.x

- Manifest auto-sync script (`scripts/sync-slides.mjs` → regenerates `deck/index.ts`)
- Multi-deck support (`decks/<name>/` + deck switcher) — a natural
  extension of the folder model; still one deck per app in v1
- Drag-to-reorder UI (v1 reorders by renaming folders / editing the manifest)
- Auto-play mode, more deck themes (footer/logo chrome lives in `deck/layout.tsx`)
- Content extras: charts, Mermaid diagrams, KaTeX math, media embeds

### Explicitly out of scope

- ❌ PPTX / PDF / image export
- ❌ WYSIWYG drag-and-drop editor — this is a *code-first* tool
- ❌ MDX / DSL authoring — React + Tailwind only
- ❌ Auth, database, collaboration, cloud storage, multi-user anything

---

## 5 · The deck — App Router authoring model

**The user-facing concept is a deck — never a "project".** And a deck is
authored exactly the way a Next.js app is: a root layout, route folders
with `page.tsx`, and colocated components. If you know App Router, you
already know how to write a deck.

### Two worlds

- **The engine** (built once, invisible to authors): `app/`,
  `components/ui`, `components/slides`, `components/deck`, `lib/`
- **The deck** (the author's entire world): `deck/` — the only folder a
  deck author touches day-to-day

### Structure

```
deck/                          ← the author's entire world
├── deck.config.ts             ← deck meta: title, aspect, theme, fonts,
│                                 default transition, slide numbers
├── layout.tsx                 ← deck layout — wraps EVERY slide
│                                 (background, padding zones, footer,
│                                 logo, slide-number chrome)
├── components/                ← deck-local reusable components
│   └── kpi-card.tsx            ←   import as @/deck/components/kpi-card
├── 01-title/                  ← slide 1 — a "route folder"
│   ├── page.tsx               ←   default-export the slide + export meta
│   └── components/            ←   (optional) slide-local components and
│                                 assets, colocated like Next routes
├── 02-why-code/
│   └── page.tsx
├── 03-metrics/
│   └── page.tsx
└── index.ts                   ← manifest: explicit ordered imports
                                  (auto-regenerated by the sync script)
```

### Mapping — Next.js → deck

| Next.js App Router | pptxgen deck |
| --- | --- |
| `app/layout.tsx` wraps every page | `deck/layout.tsx` wraps every slide |
| `app/<route>/page.tsx` | `deck/<NN-name>/page.tsx` — a slide |
| routing order comes from URLs | presentation order from numbered folders → manifest |
| `export const metadata` | `export const meta: SlideMeta` (title, notes, transition) |
| colocated route components | `deck/components/` (shared) + `<NN-name>/components/` (per-slide) |
| `app/globals.css` theming | engine tokens + `deck/deck.config.ts` (theme, fonts) |

### `layout.tsx` — the deck's frame

The engine wraps every slide with the deck layout, inside the scaled
canvas:

```
SlideCanvas (fixed 1280×720, scaled to fit)
└── DeckLayout (deck/layout.tsx)   receives { children, index, total, meta }
    └── Slide (deck/<NN-name>/page.tsx)
```

```tsx
// deck/layout.tsx — one layout, every slide
import type { DeckLayoutProps } from "@/lib/types";

export default function DeckLayout({ children, index, total }: DeckLayoutProps) {
  return (
    <div className="flex h-full w-full flex-col bg-deck-bg px-24 py-20 text-deck-fg">
      <div className="flex-1">{children}</div>
      <div className="flex items-center justify-between font-mono text-sm text-deck-muted">
        <span>Slides as code</span>
        <span className="tabular-nums">
          {String(index + 1).padStart(2, "0")} / {total}
        </span>
      </div>
    </div>
  );
}
```

One file replaces per-slide chrome — change the frame once, every slide
follows. The layout receives the current slide's `{ index, total, meta }`,
so it can render numbers or branch for special-cased slides (e.g. a
full-bleed section divider that skips the footer).

### `page.tsx` — a slide

```tsx
// deck/04-metrics/page.tsx
import { Bullets, Stat, TwoColumn } from "@/components/slides";
import { KpiCard } from "@/deck/components/kpi-card";

export const meta = {
  title: "Q4 Metrics",
  notes: "Lead with MAU growth, pause on retention.",
};

export default function MetricsSlide() {
  return (
    <TwoColumn ratio="1/1">
      <Bullets items={["2.4M MAU (+38%)", "Retention at 71%", "NPS 62"]} />
      <div className="flex gap-8">
        <Stat value="2.4M" label="MAU" />
        <KpiCard value="71%" label="Retention" />
      </div>
    </TwoColumn>
  );
}
```

**Rules of the model**

1. A slide is a folder `deck/<NN-name>/` with a `page.tsx` that
   default-exports the slide component. Number prefixes set deck order.
2. `page.tsx` may export `meta: SlideMeta` — title, speaker notes,
   transition override (the deck analog of Next's `metadata` export).
3. Every slide renders inside `deck/layout.tsx`, inside the fixed
   1280×720 canvas, scaled to fit any screen.
4. Shared deck components live in `deck/components/`; slide-local ones
   colocate inside the slide's folder — exactly like Next route folders.
5. Reveal steps: wrap anything in `<Appear>` — the presenter discovers
   the step count automatically and steps through before advancing.
6. Typography: use the config-driven utilities (`font-display`,
   `font-body`, `font-mono`) — never raw family names; fonts swap via
   `deck/deck.config.ts` only.
7. The engine library (`@/components/slides`) supplies layouts and
   content primitives — deck authors import them like any other package.

**Deck-wide config** lives in `deck/deck.config.ts` (title, aspect,
theme, font slots, default transition, slide numbers). Types live in
`lib/types.ts` (engine side).

> **Transitional:** Phase 2 shipped slides as `slides/NN-name.tsx` with
> the manifest at `slides/index.ts` and config in `lib/`. **Phase 4**
> migrates the demo deck into the `deck/` structure above and moves
> `deck.config.ts` into the deck folder — the engine (manifest reader,
> layout wrapper, config import) adapts; authored content carries over
> unchanged.

---

## 6 · Routes & controls

| Route | Purpose |
| --- | --- |
| `/` | Deck overview: live thumbnail grid, click-to-preview dialogs, deck meta ✅ |
| `/present` | Presentation mode — Phase 2 shell (scaled canvas, on-screen nav); keyboard, fullscreen, URL sync land in Phase 3 |
| `/speaker` | Speaker console — second window, follows the presenter via `BroadcastChannel` |
| `/style` | Design system specimen — tokens, primitives, all 8 font specimens ✅ |

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
  page.tsx              # overview: live thumbnails + preview dialogs        ✅
  present/page.tsx      # presenter shell (stub) — hardened in Phase 3       ✅*
  speaker/page.tsx      # → speaker console                                    (Phase 6)
components/
  ui/                   # shadcn kit (Base UI) — the chrome primitives       ✅
    button · dialog · tooltip · badge · progress · separator · kbd
  deck/                 # the engine                                           ✅
    deck-data.ts        #   manifest resolution (components + meta)           ✅
    deck-provider.tsx   #   context + reducer: index/step, clamped nav        ✅
    slide-canvas.tsx    #   fixed logical canvas, scaled + letterboxed        ✅
    slide-card.tsx      #   overview card + click-to-preview dialog          ✅
  slides/               # THE reusable deck library (product's heart)
    Slide.tsx           #   semantic frame: bg, zones, numbers               (Phase 4)
    layouts/            #   TitleSlide, TwoColumn, Grid, …                   (Phase 4)
    content/            #   Bullets, CodeBlock, Stat, …                       (Phase 4)
    motion/             #   Appear, stagger helpers                           (Phase 5)
    index.ts            #   public barrel
  presenter/            # PresenterShell, ProgressBar, overlays                (Phases 3,6,7)
lib/
  types.ts              # SlideMeta, DeckConfig, SlideModule, DeckFonts      ✅
  deck.config.ts        # deck settings (moves into deck/ in Phase 4)        ✅
  fonts.ts              # 8-family registry + semantic var mapping            ✅
  canvas.ts             # logical canvas size + aspect class from config     ✅
  utils.ts              # cn (shadcn)                                         ✅
  hooks/                # useKeyboard, useFullscreen, …                      (Phase 3+)
slides/                 # transitional — becomes deck/ in Phase 4
  index.ts              # ordered manifest (→ deck/index.ts)                ✅
  01-title.tsx …        # demo deck: title, why-code, metrics                ✅
scripts/
  sync-slides.mjs       # regenerates the manifest                           (v1.x)
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
5. **Manifest** — explicit ordered imports of each slide module
   (`{ default, meta }`). Today `slides/index.ts`; Phase 4 moves it to
   `deck/index.ts` with the App Router structure. Predictable,
   HMR-friendly, script-synced later.
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
| 2 | Slide engine | Scaled canvas, manifest wiring, 3 demo slides, `/` overview grid with preview dialogs | ✅ done |
| 3 | Presenter v1 | Keyboard nav, fullscreen, URL sync, progress UI, fade — hardens the `/present` shell into the *walking skeleton: end-to-end presenting works* | ⬜ |
| 4 | Deck structure | App Router authoring model — migrate to `deck/` (`layout.tsx` frame, `components/`, `NN-name/page.tsx` slides), config moves into the deck, engine wraps slides in the deck layout | ⬜ |
| 5 | Component library | Engine layouts + content primitives for `page.tsx`/`layout.tsx` (`TitleSlide`, `TwoColumn`, `Bullets`, `Stat`, `CodeBlock`…), polished default deck theme | ⬜ |
| 6 | Reveal steps | `<Appear>` fragments, step-aware nav, staggered bullets, slide/zoom transitions + overrides | ⬜ |
| 7 | Speaker experience | `/speaker` console (notes, next preview, timer), BroadcastChannel sync, blank screens, `?` help | ⬜ |
| 8 | Polish | Overview overlay, slide numbers, deck theme presets, authoring guide, Playwright smoke test | ⬜ |
| 9 | Content extras | Charts, Mermaid, KaTeX, media embeds — theme-styled, shippable in any order | ⬜ |

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

**Phase 2 — added today (2026-11-23)**

- `components/deck/` — the engine: `deck-data.ts` (manifest resolution),
  `slide-canvas.tsx` (fixed 1280×720 logical canvas, ResizeObserver +
  transform-scale, letterboxed centering), `deck-provider.tsx` (context +
  reducer over `{index, step}` with clamped nav — ready for Phase 3 URL
  sync and Phase 5 fragments), `slide-card.tsx` (overview card +
  click-to-preview dialog showing speaker notes)
- `lib/canvas.ts` — canvas dimensions + aspect class derived from config
- Demo deck (dogfooding — it pitches the app itself): `slides/01-title.tsx`,
  `02-why-code.tsx`, `03-metrics.tsx`; manifest wired
- `/` overview: deck header (title, aspect, font slots), live thumbnail
  grid, preview dialogs, Present CTA
- `/present`: presenter shell stub — canvas letterboxed on black, on-screen
  prev/next + padded counter (keyboard/fullscreen/URL sync = Phase 3)
- A11y: link-buttons use `buttonVariants()`-styled `<Link>` (Base UI
  `nativeButton` semantics preserved)
- Verified at runtime: thumbnail scale exact (0.2896 @ 370px), preview
  dialog, full 01→03 navigation with button clamping, zero console
  errors/warnings

---

## 9 · Next step

**Phase 3 — presenter v1**: harden the `/present` shell into the real
presenter — keyboard control (arrows/Space/Home/End/number jumps),
fullscreen API, URL as source of truth (`?s=&st=` via
`history.replaceState`), progress bar, fade transitions between slides,
and the overview grid overlay (O/Esc). At the end of Phase 3, end-to-end
presenting works — the walking skeleton.

Right after, **Phase 4 — deck structure** reshapes authoring into the
App Router-shaped `deck/` (§5): `layout.tsx` wrapping every slide,
`deck/components/` for reusable deck-local parts, `NN-name/page.tsx`
slides, and `deck.config.ts` inside the deck.
