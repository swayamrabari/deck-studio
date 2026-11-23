# PLAN — pptxgen · Code-First Presentation Platform

> **Users log in, create decks in the browser, and author slides as React
> components in a Next.js-style project structure — through a code-editor
> interface with live preview — and present from the same app.** No export
> pipeline, ever.

*Working name `pptxgen` — kept from the folder. Ironic: this platform never
generates a `.pptx`. Rename freely; nothing depends on the name.*

---

## 1 · Vision

pptxgen is a **hosted, multi-user platform**, not a local dev tool. Users
sign in, own a dashboard of decks, and author each deck in the browser with
a code-editor interface — the full power of React + Tailwind, now with zero
local setup. The engine built in Phases 0–2 becomes the platform's core.

- **Code is the source of truth.** A deck is a folder of files stored in the
  platform database — structured exactly like a Next.js App Router project,
  so the mental model transfers 1:1 from app development.
- **Instant preview loop.** Edits transpile in the browser and re-render the
  sandboxed preview — no server round-trip per keystroke.
- **The presenter is the product.** The editor preview, the full presenter,
  and (later) share links all drive the same runtime. Export stays dead.

---

## 2 · Locked decisions

| Decision | Choice |
| --- | --- |
| Product model | **Hosted multi-user platform** — login, deck dashboard, browser authoring (pivoted from the single-deck local tool) |
| Decks | Many per user; a deck = a file tree in the database, App Router-shaped |
| Auth (v1) | **Custom token-based, minimal** — email + password (hashed), opaque session tokens in httpOnly cookies. Upgrade path: Better Auth / OAuth |
| Database (v1) | **SQLite via Node's built-in `node:sqlite` + Drizzle (sqlite-proxy adapter)** — zero native dependencies; schema portable to Postgres later |
| Deck runtime | **Custom in-browser runtime** — transpile → virtual modules → sandboxed iframe; Tailwind v4 browser build |
| Editor | **CodeMirror 6**, custom-themed to the studio system (consistency-first); workspace chrome from shadcn (Tabs, Tree); Monaco as a later option |
| UI kit | **shadcn/ui** (Base UI primitives, `nova` style, neutral base) |
| Chrome mode | **Always dark studio**, monochrome |
| Fonts | 8-family registry, config-driven slots (`display/body/mono`) |
| Reveal steps | v1 core — `<Appear>` fragments, step-aware navigation |
| Extras roadmap | Charts, Mermaid, KaTeX, media embeds |
| Export | **None.** Presenter only |
| Collaboration | Out of v1 — multi-user ≠ real-time co-editing |

---

## 3 · Design language ("studio")

Two principles, enforced by architecture:

1. **"Chrome recedes, content leads."** Every tool surface (landing,
   dashboard, editor workspace, presenter, speaker console, dialogs) is a
   grayscale studio. The deck is the only thing on screen with color and
   personality.
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
  (`font-ui-mono`), 11px uppercase tracked micro-labels, tabular numerals.
- `dark:` variants stay inert by design — the `:root` palette is the one
  and only palette.

**Font system**

- `lib/fonts.ts` — the registry: **Geist, Inter, Space Grotesk, Source
  Serif 4, Playfair Display, Fraunces, JetBrains Mono, Geist Mono** (all
  next/font, self-hosted; browsers only download applied families). Any
  Google font or local file = one registry entry.
- `deck.config.ts → fonts: { display, body, mono }` picks registry keys;
  the root layout maps semantic vars (`--deck-font-*`) onto them.
- Slides use only semantic utilities: `font-display`, `font-body`,
  `font-mono`. Swapping a deck's entire type system = one config line.

**Consistency enforcement:** the `/style` specimen page renders every
token, every primitive, and all 8 font specimens — the checkable source of
truth and a visual regression fixture. Chrome surfaces consume only
`components/ui/*` primitives (Button, Dialog, Tooltip, Badge, Progress,
Separator, Kbd).

---

## 4 · The deck — App Router file contract

**The user-facing concept is a deck — never a "project".** A deck is
authored exactly the way a Next.js app is: a root layout, route folders
with `page.tsx`, and colocated components. If you know App Router, you
already know how to write a deck.

In the platform, this structure is **the contract**: it is what the
database stores, what the editor's file tree shows and validates, and what
the runtime executes.

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
```

Slide order = the numbered folder prefixes, **resolved by the runtime** —
no manifest file to maintain.

### Mapping — Next.js → deck

| Next.js App Router | pptxgen deck |
| --- | --- |
| `app/layout.tsx` wraps every page | `deck/layout.tsx` wraps every slide |
| `app/<route>/page.tsx` | `deck/<NN-name>/page.tsx` — a slide |
| routing order comes from URLs | presentation order from numbered folders |
| `export const metadata` | `export const meta: SlideMeta` (title, notes, transition) |
| colocated route components | `deck/components/` (shared) + `<NN-name>/components/` (per-slide) |
| `app/globals.css` theming | engine tokens + `deck/deck.config.ts` (theme, fonts) |

### `layout.tsx` — the deck's frame

The runtime wraps every slide with the deck layout, inside the scaled
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

**Rules of the contract**

1. A slide is a folder `deck/<NN-name>/` with a `page.tsx` that
   default-exports the slide component. Number prefixes set deck order.
2. `page.tsx` may export `meta: SlideMeta` — title, speaker notes,
   transition override (the deck analog of Next's `metadata` export).
3. Every slide renders inside `deck/layout.tsx`, inside the fixed
   1280×720 canvas, scaled to fit any screen.
4. Shared deck components live in `deck/components/`; slide-local ones
   colocate inside the slide's folder — exactly like Next route folders.
5. Reveal steps: wrap anything in `<Appear>` — the presenter discovers the
   step count automatically and steps through before advancing.
6. Typography: use the config-driven utilities (`font-display`,
   `font-body`, `font-mono`) — never raw family names; fonts swap via
   `deck/deck.config.ts` only.
7. The engine library (`@/components/slides`) supplies layouts and content
   primitives — resolved by the runtime's module map like any package.

---

## 5 · Platform architecture

### Surfaces

```
/                     landing (redirects to /decks when signed in)      ✅
/login, /signup       token auth                                          ✅
/decks                dashboard — your decks + New deck (seeded from
                      the starter template)                              ✅
/decks/[id]/edit      workspace — file tree │ editor tabs │ live preview
                      (preview placeholder until Phase 5)                  ✅
/decks/[id]/present   full presenter, driven through the runtime frame
/share/[token]        read-only present link (Phase 10, polish)
```

**Presenter keyboard map (unchanged)**

| Key | Action |
| --- | --- |
| `→` / `Space` / `N` | Next step, then next slide |
| `←` / `P` | Previous |
| `Home` / `End` | First / last slide |
| `F` | Toggle fullscreen |
| `O` / `Esc` | Slide overview grid |
| `S` | Pop out speaker view |
| `B` / `W` | Black / white attention screen |
| `1-9` + `Enter` | Jump to slide number |
| `?` | Shortcut overlay |

### Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** — app chrome compiled normally; deck content styled
  by `@tailwindcss/browser` inside the runtime frame
- **shadcn/ui** on Base UI + **lucide-react** icons
- **CodeMirror 6** — the editing surface, custom studio theme
- **SQLite via `node:sqlite`** + Drizzle's sqlite-proxy adapter — fully
  typed queries with zero native dependencies (better-sqlite3 was tried
  and its binary hard-crashes on this machine); migrations are plain
  generated `.sql` files applied by a tiny sync runner on boot
- **Custom token auth** — scrypt password hashes, opaque session tokens
  stored as sha256, httpOnly cookies
- **Runtime**: Babel standalone transpile (SWC-wasm upgrade path) + custom
  module resolver + same-origin sandboxed iframe
- No external auth vendors, no hosted DB in v1 — the upgrade path
  (Better Auth / OAuth, Postgres) is documented, not built

### Data model (SQLite, portable to Postgres)

```
users      (id, email, password_hash, created_at)
sessions   (token, user_id, expires_at)
decks      (id, owner_id → users, title, share_token?, created_at, updated_at)
deck_files (id, deck_id → decks, path, content, updated_at)
             path: "deck/deck.config.ts", "deck/layout.tsx",
                   "deck/01-title/page.tsx", "deck/components/kpi-card.tsx", …
```

A deck **is** its file tree; `deck_files` rows are the tree's leaves.

### Deck runtime — the heart

```
editor saves ──► DB (deck_files)
                    │  load (paths → contents)
                    ▼
        [1] TRANSPILE   TSX → JS in the browser (Babel standalone)
        [2] RESOLVE      virtual module map:
                         · deck files — relative imports + @/deck/* aliases
                         · engine modules provided by the frame:
                           react, react-dom/client, @/components/slides,
                           @/components/ui, @/lib/canvas, …
        [3] RENDER       same-origin sandboxed iframe (runtime harness
                         route): the engine mounts once inside the frame,
                         executes the deck modules, wraps each slide in
                         deck/layout.tsx inside the fixed 1280×720 canvas
        [4] STYLE        @tailwindcss/browser generates classes inside the
                         frame; deck palette + font tokens injected
        [5] DRIVE        host ⇄ frame via postMessage: files in,
                         { index, step } + errors out, nav commands in
```

- **Zero server compute per edit** — transpile, resolve, and render all
  happen in the user's browser.
- The editor preview and the presenter drive the **same frame**; present
  mode is the frame at full viewport with keyboard control.
- **Safety**: user code executes only inside the frame — never on the host
  page, never on the server. No server-side transpilation.

### What survives from Phases 0–2 (nothing wasted)

| Built | Becomes |
| --- | --- |
| Studio design system, shadcn kit, fonts, `/style` | Platform chrome — landing, dashboard, editor, dialogs |
| `SlideCanvas`, `DeckProvider`, `lib/canvas`, `lib/types` | The engine inside the runtime frame |
| App Router deck model (§4) | The file contract stored in the DB, shown in the file tree, executed by the runtime |
| Demo deck (`slides/`) | The starter template seeded into every new deck |
| `/` overview + `/present` stub | Transitional — superseded by `/decks` + `/decks/[id]/present` |

---

## 6 · Editor workspace (spec → shipped)

Three panes, one studio:

- **Left — file tree**: the deck contract made visible. Folders derive
  from paths; rows are keyboard-accessible. Create (`New slide` with
  auto-numbering, `New file` by path), rename (path dialog; tabs
  follow), delete (confirm dialog; folders delete recursively).
- **Center — editor**: closable tab strip + **CodeMirror 6** (Geist
  Mono, custom studio theme, TSX/CSS language modes, autocomplete,
  find/replace). Debounced autosave (800ms) + `Cmd+S`, dirty dots per
  tab, header save status.
- **Right — live preview**: placeholder canvas until the Phase 5
  runtime lands.

The storage API lives at `/api/decks/[id]/files` (GET/POST/PUT/PATCH/
DELETE) with ownership checks, `deck/` path validation, and prefix-based
folder operations.

---

## 7 · Build phases

| # | Phase | Status |
| --- | --- | --- |
| 0 | Engine foundation — scaffold, types, deck tokens | ✅ done |
| 1 | Design foundation — shadcn studio, font registry, `/style` | ✅ done |
| 2 | Slide engine core — scaled canvas, provider, local overview + present stub (transitional) | ✅ done |
| 3 | **Platform foundation** — token auth (signup/login/logout), SQLite + Drizzle schema, decks CRUD API, `/decks` dashboard, starter template seeding | ✅ done |
| 4 | **Editor workspace** — file tree CRUD, shadcn Tabs + CodeMirror (studio theme), autosave; preview static until Phase 5 | ✅ done |
| 5 | **Deck runtime** — transpile, virtual modules, sandboxed frame, Tailwind browser: live preview goes end-to-end | ✅ done |
| 6 | **Hosted presenter** — `/decks/[id]/present`: keyboard, fullscreen, URL sync, progress bar, fade transitions | ⬜ |
| 7 | **Engine library** — layouts + content primitives exported through the runtime module map (`@/components/slides`) | ⬜ |
| 8 | **Reveal steps** — `<Appear>` fragments, step-aware nav in runtime + presenter | ⬜ |
| 9 | **Speaker console** — notes, next-slide preview, timer, cross-window sync | ⬜ |
| 10 | **Polish** — share links, template gallery, Playwright smoke test, authoring guide | ⬜ |
| 11 | **Extras** — charts, Mermaid, KaTeX, media embeds | ⬜ |

**Phase 3 — what exists (2026-11-23)**

- Auth: `lib/auth.ts` — scrypt password hashing, opaque session tokens
  (sha256-stored), httpOnly cookies; `requireUser()` page guard with
  `connection()` for Cache Components; signup/login/logout API routes
- Storage: `db/` — Drizzle schema (`users`, `sessions`, `decks`,
  `deck_files`), migrations via generated `.sql` + a sync runner on
  boot, lazy connection that never touches SQLite during builds;
  better-sqlite3 was replaced by Node's built-in `node:sqlite` after its
  binary hard-crashed — zero native deps now
- Deck CRUD: create (seeded from `templates/starter/` — 6 files incl.
  `layout.tsx` + a deck-local component), delete (cascade), dashboard
  with live slide counts; `/decks/[id]/edit` placeholder lists stored
  files until the Phase 4 workspace
- Cache Components compliance: `instant = false` on the five auth-aware
  routes; studio landing, auth cards, deck cards with delete dialogs,
  user menu
- Verified live: signup → dashboard → new deck (6 seeded files) →
  delete (cascade) → sign out → sign in (HTTP round-trip too), zero
  console errors

**Phase 4 — what exists**

- File API: `app/api/decks/[id]/files` — GET/POST/PUT/PATCH/DELETE with
  ownership checks, path validation (`deck/` contract, no traversal),
  size caps, prefix renames for folders, recursive deletes, and
  `updatedAt` bumps (dashboard ordering reflects edits)
- Workspace `/decks/[id]/edit`: three panes — file tree (implicit
  folders, collapsible, keyboard-accessible rows, hover rename/delete),
  tabs + **CodeMirror 6** in a token-driven studio theme (Geist Mono,
  restrained syntax palette), preview placeholder until Phase 5
- Actions: **New slide** (auto-numbered `deck/NN-new-slide/page.tsx`
  stub), New file (path dialog), rename (path dialog, tabs follow),
  delete file/folder (confirm dialog with subtree count)
- Autosave: 800ms debounce per file + `Cmd+S` flush, per-tab dirty dots,
  header status (Saved / Unsaved changes / Saving… / Save error)
- a11y: tree rows are focusable buttons; hover actions stay in the
  accessibility tree and tab order
- Verified live: new slide → edit → autosave persisted (API-confirmed) →
  rename (tree + tabs follow) → folder delete (recursive, tab cleanup),
  zero console errors

**Phase 5 — what exists**

- Runtime frame `/runtime` (sandboxed same-origin iframe): compiles the
  whole deck in-browser — Babel standalone (TSX → CommonJS), a virtual
  module map (deck files by path with relative + `@/` alias resolution;
  engine modules `react`, `react/jsx-runtime`, `@/lib/types`), and a tiny
  CJS loader with caching. Renders `deck/layout.tsx` wrapping the active
  slide inside the fixed canvas; slides ordered by `NN-` prefixes
- Tailwind's browser build (client-only dynamic import) generates
  user-written utilities inside the frame, seeded with the deck palette +
  semantic font tokens via a `text/tailwindcss` `@theme` block
- postMessage protocol with a **ready handshake** (`deck:frame-ready` →
  host sends `deck:load`; fixes the hydration race), `deck:ready`
  (slide count), `deck:error`; render crashes caught by a slide error
  boundary; compile errors surface in-frame and in the workspace status
- Workspace preview pane (now always visible, 320px / 400px on xl)
  follows the active slide file, debounces loads (400ms), and shows
  `Live · N slides` or the compile error
- Verified live: deck renders at the exact canvas scale inside the frame;
  editing `layout.tsx` recompiled instantly (marker layout rendered
  around the slide); restore → original persisted, SAVED; zero console
  errors

---

## 8 · Out of scope

- ❌ PPTX / PDF / image export — presenter only, forever
- ❌ Real-time collaboration / co-editing (v1: one editor at a time)
- ❌ Teams, orgs, billing
- ❌ Server-side execution of user code
- ❌ WYSIWYG editor, MDX / DSL authoring
- ❌ External auth vendors + hosted Postgres in v1 (documented upgrade path
      instead: Better Auth / OAuth, Postgres)

---

## 9 · Next step

**Phase 6 — hosted presenter:** `/decks/[id]/present` — the same runtime
frame at full viewport, driven by the presenter: keyboard control
(arrows/Space/Home/End/number jumps), fullscreen API, `?s=` URL sync,
progress bar, fade transitions between slides, and the cross-frame
index messages (`deck:index`) that are already in the protocol. At the
end of Phase 6, the platform presents real, user-authored decks.
