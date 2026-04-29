# Mexico Trip App

PWA replacing Wanderlog for the 1–10 May 2026 Mexico trip (Josiah + Débora). Two-person realtime, sortable itinerary, day-aware map, full offline.

## Stack (verified — read this before writing code)

The implementation plan was authored assuming Next 15 / Tailwind v3. The repo actually runs:

- **Next.js 16** (App Router, RSC). `params` is a Promise — `await params` in server components.
- **React 19**.
- **Tailwind v4** — no `tailwind.config.ts`. Tokens live as CSS custom properties in `@theme {}` inside `app/globals.css`. Tailwind generates utilities (`bg-bg`, `text-accent`, etc.) from those vars.
- **Middleware → `proxy.ts`**. Next 16 deprecated `middleware.ts`; we use `proxy.ts` at the repo root with a named `proxy` export. Same shape as old middleware.
- **TypeScript strict**, **path alias** `@/*` → repo root.

When the plan shows a code block that uses `tailwind.config.ts`, port the colours into `@theme` instead. When it references `middleware.ts`, write `proxy.ts`. Otherwise the plan's code is canonical.

## External services

All credentials in `.env.local` (gitignored):

- **Supabase project ref:** `onqausotiygxaodetcsf`
- **GitHub:** `github.com/duragdragon/mexico-trip` (public — see `docs/superpowers/specs/2026-04-29-mexico-trip-app-design.md` for why)
- **Mapbox:** public token only, no offline tile fetching beyond runtime cache

## Repo layout

```
app/                  Next.js routes
  (app)/              Authed group (protected by proxy.ts later)
  sign-in/, auth/     Public auth flow (added Phase 3)
components/           UI components
lib/                  Domain code (supabase clients, dexie, sync, mapbox helpers)
supabase/             Migrations + seed-data module
docs/superpowers/     spec + plan
proxy.ts              Trip-day redirect + (later) auth gate
```

## Commands

```bash
npm run dev        # localhost:3000
npm run build      # prod build, type check
npm test           # vitest (added Phase 4)
supabase db push   # apply migrations to remote
```

## Editorial Warm theme (locked)

Sand `#faf5ee` · ink `#2b1c14` · terracotta accent `#c45f3c` · Georgia serif headers. Tokens in `app/globals.css @theme` and `lib/theme.ts`. Don't introduce new colours without updating both.

## Working with the plan

- `docs/superpowers/specs/2026-04-29-mexico-trip-app-design.md` — design spec (authoritative on intent)
- `docs/superpowers/plans/2026-04-29-mexico-trip-app.md` — phase-by-phase implementation plan
- Each phase commits its work with the messages in the plan. Don't squash.
- Don't push to remote — the controller does that.
