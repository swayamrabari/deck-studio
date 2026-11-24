# Deck Studio

A **code-first presentation platform**. Log in, create decks in the
browser through a code-editor interface, author slides as React
components in a Next.js-style project structure — and present from the
same app. No export pipeline, ever.

*Previously the `pptxgen` working name — despite the folder and the
package name, this project never generates a `.pptx`.*

**Status:** Phases 0–8 complete — log in → create a deck → code it with
live preview (CSS-owned styling, config aspect, media uploads) → present
fullscreen with reveal steps. Full scope, architecture, and roadmap in
**[PLAN.md](./PLAN.md)**.

> **Single-user mode:** registrations are closed by default — the signup
> page and API refuse new accounts. To open them back up, set
> `ALLOW_SIGNUPS=1` in the environment before starting the server. Login
> always works for existing accounts.

## Quick start

Storage is **Postgres (Supabase)** — see [Deploy](#deploy--supabase--vercel)
for the one-time setup (create the project, set `DATABASE_URL`, run the
schema migration, import any existing SQLite data), then:

```bash
npm install
npm run dev
```

| Route | Purpose | Status |
| --- | --- | --- |
| `/` | Landing (redirects to your decks when signed in) | ✅ |
| `/login` | Token auth (email + password, rate-limited) | ✅ |
| `/signup` | Registrations **closed by default** — set `ALLOW_SIGNUPS=1` to re-open | 🔒 |
| `/decks` | Dashboard — your decks (seeded from the starter template), rename/delete | ✅ |
| `/decks/[id]/edit` | Workspace — file tree, media, CodeMirror 6, autosave, **live preview**, **resizable/collapsible panes**, named new slides, slide-folder rename, project rename | ✅ |
| `/decks/[id]/present` | Hosted presenter — keyboard, fullscreen, `?s=`/`?st=` deep links, progress bar, reveal steps | ✅ |
| `/style` | Design system specimen — tokens, primitives, all 14 fonts | ✅ |
| `/present` | Local presenter stub (transitional) | ✅ stub |

## The model

Decks are authored like Next.js apps: `deck/layout.tsx` wraps every slide,
one `NN-name/page.tsx` per slide, `deck/components/` for reusable parts.
The sidebar works like VS Code's explorer: **New file** and **New folder**
buttons sit on the tree header, and hovering any folder row reveals a
**+** that opens a scoped new-file dialog (the folder is a fixed prefix
in the input — you only type the name). Slide folders can keep private
helpers next to their `page.tsx`, and an open slide's tab shows its
presentation number (`page.tsx 01`). New folders appear in the tree
immediately and become permanent with the first file added inside. The
platform stores this structure in the database; the browser editor shows
it as a file tree and a sandboxed in-browser runtime compiles and renders
it (transpile → virtual modules → iframe).

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

`deck/deck.config.ts` sets behavior: `aspect` (`16:9` → 1280×720,
`4:3` → 960×720) and `slideNumbers` (passed to your `layout.tsx`). The
workspace preview box follows `aspect` automatically.
**There is no theme or font config** — colors, surfaces, typography, and
fonts all live in `deck/styles.css`. Slide changes are instant cuts;
there are no transitions.

The presenter progress bar is optional and configurable:

```ts
progress: {
  show: true,
  position: "top",              // "top" | "bottom"
  height: 2,                    // pixels
  color: "rgba(255,255,255,0.7)",
  trackColor: "rgba(255,255,255,0.1)",
},
```

### Media

Upload images from the workspace (`+` → **Upload media…**) — they appear
under a `media` folder with preview and delete, stored in the database
and served per deck. PNG, JPEG, GIF, WebP, and AVIF are supported (SVG is
excluded — it executes script and media is served same-origin). Responses
carry an ETag, so unchanged images revalidate with 304s instead of
re-downloading. Use them in any slide:

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

## Deploy (Supabase + Vercel)

Storage is Postgres on Supabase; the app talks to it directly with
drizzle + postgres.js (no anon key, no RLS needed — every query runs
server-side behind the auth routes).

**One-time setup:**

1. Create a Supabase project, then copy the **Transaction pooler**
   connection string (Project Settings → Database → Connection string →
   *Transaction pooler*, port **6543** — this is the serverless-safe one).
2. `cp .env.example .env.local` and set `DATABASE_URL` to that string.
3. Create the schema:

   ```bash
   npm run db:migrate
   ```

4. Bring your existing local data (users, decks, files, media — sessions
   are skipped, sign in once afterwards). The import is idempotent:
   existing rows are skipped, so re-running is safe:

   ```bash
   npm run db:import
   ```

5. `npm run dev`, sign in, open a deck — you're on Postgres.

**Vercel:**

1. Push the repo and import it into Vercel (plain Next.js settings —
   no build tweaks needed), **or skip Git entirely and run `vercel --prod`
   from this folder** — the CLI deploys the build directly.
2. Add the same `DATABASE_URL` (transaction pooler) as an environment
   variable. `ALLOW_SIGNUPS` stays unset — registrations closed,
   single-user login only.
3. Deploy. Every dynamic route renders per-request against Supabase;
   the runtime iframe, editor, and presenter are unchanged.

**Keep-alive (deploy-and-forget):** `vercel.json` schedules Vercel Cron
to hit `/api/health` once a day (Hobby plan allows one daily cron) — the
route runs a real database query, which counts as Supabase activity, so
the project never idles into a pause. This needs no GitHub activity and
nothing to maintain. The GitHub workflow
(`.github/workflows/db-keepalive.yml`) is an optional manual backup: if
you use it, add the repo secret `SUPABASE_DB_URL` (the same
transaction-pooler string) and note that GitHub auto-disables scheduled
workflows after ~60 days without commits — which is why the Vercel cron
is the primary.

**Notes:** migrations are applied with `npm run db:migrate` (there is no
runtime migrator on serverless); generate new ones after schema edits
with `npm run db:generate`. TLS is enforced automatically — if the URL
lacks `sslmode`, the app appends `sslmode=require`. The schedule is UTC
— edit the `cron:` line to your preferred time.

Details, architecture, and the phase-by-phase roadmap: **[PLAN.md](./PLAN.md)**.
