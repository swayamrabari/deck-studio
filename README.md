# Deck Studio

> ⚠️ **Controlled access.** This app is private and single-user —
> registration is closed and only existing accounts can sign in. Deploy
> and use it for yourself only. (To temporarily open registration, set
> `ALLOW_SIGNUPS=1` in the environment.)

A code-first presentation platform: write slides as React components in
a browser editor, preview them live, and present from the same app.
No exports, ever.

## Setup

Requires a Postgres database (Supabase recommended):

1. Create a Supabase project and copy the **Transaction pooler**
   connection string (port **6543**).
2. `cp .env.example .env.local` and set `DATABASE_URL` to that string.
3. `npm install` → `npm run db:migrate`
4. `npm run dev` → sign in at `/login`.

Migrating from an older local SQLite install? Run `npm run db:import`
once — it copies your existing users, decks, files, and media (safe to
re-run; you sign in once afterwards).

## What's inside

- **`/decks`** — dashboard: create, rename, and delete decks. New decks
  start from a small starter template.
- **`/decks/[id]/edit`** — VS Code-style workspace: file tree with
  new-file/new-folder actions, code editor with autosave and Prettier
  formatting, image uploads, and a live preview.
- **`/decks/[id]/present`** — full-screen presenter: keyboard control,
  `?s=`/`?st=` deep links, progress bar, and reveal steps.
- **`/login`** — token auth (rate-limited).

Decks are authored like Next.js apps: `deck/layout.tsx` wraps every
slide, one `NN-name/page.tsx` per slide, `deck/components/` for shared
parts. All styling lives in `deck/styles.css` — colors, fonts, and the
slide frame itself are plain, editable CSS. Slide changes are instant
cuts; there are no transitions.

## Deploy (Vercel + Supabase)

1. Import the repo into Vercel (or run `vercel --prod` from this
   folder) and set `DATABASE_URL` to the same transaction-pooler
   string. Nothing else is required.
2. `vercel.json` schedules a daily Vercel Cron against `/api/health`,
   which queries the database — Supabase free projects never idle
   into a pause. No maintenance needed.
3. After schema edits: `npm run db:generate` (create a migration), then
   `npm run db:migrate` (apply it).
