# Mexico Trip App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a two-person PWA replacing Wanderlog for the 1–10 May 2026 Mexico trip — sortable itinerary, day-aware map, full offline, realtime sync between Josiah and Débora.

**Architecture:** Next.js 15 App Router on Vercel. Supabase for auth + Postgres + realtime + storage. Mapbox GL JS for the map. Local-first reads via IndexedDB (Dexie); writes are optimistic and queue offline. Service worker (Workbox) handles app shell + map tile caching.

**Tech Stack:** TypeScript · Next.js 15 (App Router, RSC) · Tailwind v3 · Supabase (`@supabase/ssr`, `@supabase/supabase-js`) · Mapbox GL JS v3 · Dexie 4 · Workbox 7 · `dnd-kit` (drag-sort)

**Spec:** `docs/superpowers/specs/2026-04-29-mexico-trip-app-design.md`

**Deviation from spec:** Spec puts the Next app at `apps/web/`. We're flattening to a single-app repo (Next.js at the root) — the `apps/` nesting is overhead for a one-trip project.

---

## Phases

- **Phase 0** — External services setup (Chrome-driven, one-shot)
- **Phase 1** — Repo scaffold + design tokens
- **Phase 2** — Database schema + RLS + seed data
- **Phase 3** — Auth (magic link + invite)
- **Phase 4** — Data layer (server + client + Dexie mirror + write queue)
- **Phase 5** — Realtime sync + presence
- **Phase 6** — Days view (timeline + drag-sort)
- **Phase 7** — Item detail + edit sheet + attachments
- **Phase 8** — Map view (Mapbox + day-toggle + pin card)
- **Phase 9** — Wishlist + drag-to-schedule
- **Phase 10** — Smart features (travel time + opening hours)
- **Phase 11** — Offline (service worker + tile cache + PWA install)
- **Phase 12** — Deploy + final verification

---

# Phase 0 — External services setup

These are Chrome-driven tasks. Each produces a credential or URL we'll need later. Capture every value in `~/Code/mexico-trip/.env.local` (gitignored).

### Task 0.1: GitHub repo

**Files:**
- Create: `~/Code/mexico-trip/.gitignore`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
node_modules/
.next/
.env*.local
.DS_Store
*.log
.vercel/
.superpowers/
out/
coverage/
```

- [ ] **Step 2: Create private GitHub repo `josiah/mexico-trip` via Chrome**

Navigate to `https://github.com/new`, sign in if needed, fill: Owner=josiah, Name=`mexico-trip`, Visibility=Private, do NOT initialize with README/license/gitignore (we already have a local repo). Click Create repository.

Capture the SSH URL (e.g. `git@github.com:josiah/mexico-trip.git`).

- [ ] **Step 3: Wire local repo to remote**

```bash
cd ~/Code/mexico-trip
git remote add origin git@github.com:josiah/mexico-trip.git
git branch -M main
git push -u origin main
```

Expected: push succeeds, GitHub shows the spec commit.

### Task 0.2: Supabase project

- [ ] **Step 1: Create project via Chrome**

Navigate to `https://supabase.com/dashboard/projects`, sign in. New project: Name=`mexico-trip-may-2026`, Region=`eu-west-2` (London — closer to home than US), strong DB password (save in 1Password).

- [ ] **Step 2: Capture credentials into `.env.local`**

From Project Settings → API, copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role secret → `SUPABASE_SERVICE_ROLE_KEY`

Write to `~/Code/mexico-trip/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- [ ] **Step 3: Note project ref**

Project ref (from URL `<ref>.supabase.co`) → save for CLI use.

### Task 0.3: Mapbox token

- [ ] **Step 1: Create Mapbox account via Chrome**

`https://account.mapbox.com/auth/signup/`. Sign in, create a Default public token with URL restrictions to `localhost:*` and `*.vercel.app` initially (we'll add a custom domain later if added).

- [ ] **Step 2: Add to `.env.local`**

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk....
```

### Task 0.4: Vercel project (defer linking until Phase 12)

We'll create the Vercel project at deploy time, after the app builds locally. No setup needed in Phase 0.

---

# Phase 1 — Repo scaffold + design tokens

### Task 1.1: Scaffold Next.js app at repo root

**Files:**
- Create: `~/Code/mexico-trip/package.json`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`

- [ ] **Step 1: Run `create-next-app` into existing dir**

```bash
cd ~/Code/mexico-trip
npx create-next-app@latest . \
  --typescript --app --tailwind \
  --src-dir false --import-alias "@/*" \
  --no-eslint --use-npm --no-git
```

Answer "Yes" if prompted to overwrite. Verify `app/page.tsx` exists.

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Expected: server on `http://localhost:3000` showing the Next default page. Stop with Ctrl+C.

- [ ] **Step 3: Commit scaffold**

```bash
git add -A
git commit -m "scaffold: Next.js 15 + TS + Tailwind"
```

### Task 1.2: Editorial Warm design tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `lib/theme.ts`

- [ ] **Step 1: Write theme constants**

`lib/theme.ts`:

```ts
export const theme = {
  colors: {
    bg: '#faf5ee',
    text: '#2b1c14',
    muted: 'rgba(43, 28, 20, 0.55)',
    rule: '#e6dcc9',
    accent: '#c45f3c',
    accentSoft: '#f4d4d0',
    accentText: '#8a3a2a',
    iconEat: '#8b4513',
    iconSee: '#b8860b',
    iconStay: '#4a6b52',
    iconFly: '#c45f3c',
  },
  fonts: {
    serif: 'Georgia, "Times New Roman", serif',
    sans: '-apple-system, system-ui, sans-serif',
  },
} as const;
```

- [ ] **Step 2: Wire tokens into Tailwind**

`tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#faf5ee',
        ink: '#2b1c14',
        muted: 'rgba(43,28,20,0.55)',
        rule: '#e6dcc9',
        accent: '#c45f3c',
        'accent-soft': '#f4d4d0',
        'accent-text': '#8a3a2a',
        'icon-eat': '#8b4513',
        'icon-see': '#b8860b',
        'icon-stay': '#4a6b52',
        'icon-fly': '#c45f3c',
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['-apple-system', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Replace `app/globals.css` body**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #faf5ee;
  --ink: #2b1c14;
  color-scheme: light;
}

html, body {
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior-y: contain;
}

.serif { font-family: Georgia, "Times New Roman", serif; }
```

- [ ] **Step 4: Smoke-check + commit**

```bash
npm run dev
```

Visit `localhost:3000` — page should now render on the sand background.

```bash
git add -A
git commit -m "style: editorial warm theme tokens"
```

### Task 1.3: App-wide layout + bottom nav skeleton

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `components/BottomNav.tsx`
- Create: `app/(app)/days/[date]/page.tsx`
- Create: `app/(app)/map/page.tsx`
- Create: `app/(app)/wishlist/page.tsx`
- Create: `app/(app)/trip/page.tsx`

- [ ] **Step 1: Root layout**

`app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Mexico Trip',
  description: 'Josiah + Débora · 1–10 May 2026',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#faf5ee',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: `(app)` group layout with bottom nav**

`app/(app)/layout.tsx`:

```tsx
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-[88px]">
      {children}
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: BottomNav component**

`components/BottomNav.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { label: 'Days', href: '/days/today', match: '/days' },
  { label: 'Map', href: '/map', match: '/map' },
  { label: 'Wishlist', href: '/wishlist', match: '/wishlist' },
  { label: 'Trip', href: '/trip', match: '/trip' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 h-[88px] pt-2 pb-6 bg-bg/95 backdrop-blur border-t border-rule flex justify-around items-start z-50">
      {items.map((item) => {
        const active = path.startsWith(item.match);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[11px] ${active ? 'text-accent font-semibold' : 'text-muted'}`}
          >
            <span className="text-xl leading-none">
              {item.label === 'Days' && '▤'}
              {item.label === 'Map' && '⌖'}
              {item.label === 'Wishlist' && '★'}
              {item.label === 'Trip' && '✈'}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Stub pages for each tab**

`app/(app)/days/[date]/page.tsx`:

```tsx
export default async function DaysPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return <main className="p-5"><h1 className="serif text-2xl">Days · {date}</h1></main>;
}
```

`app/(app)/map/page.tsx`:

```tsx
export default function MapPage() {
  return <main className="p-5"><h1 className="serif text-2xl">Map</h1></main>;
}
```

`app/(app)/wishlist/page.tsx`:

```tsx
export default function WishlistPage() {
  return <main className="p-5"><h1 className="serif text-2xl">Wishlist</h1></main>;
}
```

`app/(app)/trip/page.tsx`:

```tsx
export default function TripPage() {
  return <main className="p-5"><h1 className="serif text-2xl">Trip</h1></main>;
}
```

- [ ] **Step 5: Redirect root to current day**

Replace `app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function Root() {
  // For now hardcode; once we're past the trip-context layer this becomes "today within trip dates"
  redirect('/days/today');
}
```

- [ ] **Step 6: Resolve `/days/today` via middleware**

Create `middleware.ts` at repo root:

```ts
import { NextResponse, type NextRequest } from 'next/server';

const TRIP_START = new Date('2026-05-01');
const TRIP_END = new Date('2026-05-10');

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/days/today') {
    const now = new Date();
    let target = now;
    if (now < TRIP_START) target = TRIP_START;
    else if (now > TRIP_END) target = TRIP_END;
    const iso = target.toISOString().slice(0, 10);
    const url = req.nextUrl.clone();
    url.pathname = `/days/${iso}`;
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ['/days/today'] };
```

- [ ] **Step 7: Verify navigation works**

```bash
npm run dev
```

Tap each nav item — pages should load, the active tab should highlight terracotta. `/` should redirect to `/days/<today>`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: app shell with bottom nav and tab routes"
```

---

# Phase 2 — Database schema + RLS + seed data

We'll use the Supabase CLI for migrations. This means we author SQL files locally and `supabase db push` deploys them.

### Task 2.1: Install Supabase CLI + link project

**Files:**
- Create: `supabase/config.toml`
- Create: `.env.local` entry for project ref

- [ ] **Step 1: Install CLI**

```bash
brew install supabase/tap/supabase
supabase --version
```

Expected: prints version.

- [ ] **Step 2: Init Supabase in repo**

```bash
cd ~/Code/mexico-trip
supabase init
```

Creates `supabase/config.toml`. Answer "no" to VS Code settings prompt.

- [ ] **Step 3: Link to remote project**

```bash
supabase login   # opens browser, auths
supabase link --project-ref <ref>  # ref captured in Task 0.2
```

Enter DB password from 1Password when prompted.

- [ ] **Step 4: Commit init**

```bash
git add supabase/
git commit -m "chore: init supabase cli"
```

### Task 2.2: Migration — base tables

**Files:**
- Create: `supabase/migrations/20260429000001_base_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260429000001_base_tables.sql

create table public.trip (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  home_timezone text not null default 'Europe/London',
  destinations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.trip_member (
  trip_id uuid not null references public.trip(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create type public.item_kind as enum ('flight', 'lodging', 'activity', 'food');

create table public.item (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip(id) on delete cascade,
  kind public.item_kind not null,
  title text not null,
  scheduled_date date,
  start_time time,
  end_time time,
  sort_order integer not null default 0,
  address text,
  lat double precision,
  lng double precision,
  mapbox_place_id text,
  photo_url text,
  opening_hours jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index item_trip_date_idx on public.item (trip_id, scheduled_date, sort_order);
create index item_trip_kind_idx on public.item (trip_id, kind);

create table public.attachment (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.item(id) on delete cascade,
  kind text not null check (kind in ('pdf', 'image')),
  storage_path text not null,
  filename text not null,
  uploaded_at timestamptz not null default now()
);

create table public.travel_time_cache (
  from_lat numeric(8,5) not null,
  from_lng numeric(8,5) not null,
  to_lat numeric(8,5) not null,
  to_lng numeric(8,5) not null,
  mode text not null default 'driving',
  duration_seconds integer not null,
  cached_at timestamptz not null default now(),
  primary key (from_lat, from_lng, to_lat, to_lng, mode)
);

-- Bump updated_at on item edits
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger item_touch_updated
before update on public.item
for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Push migration**

```bash
supabase db push
```

Expected: confirms applying migration; check Supabase dashboard → Table Editor — tables visible.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "db: base tables (trip, trip_member, item, attachment, travel_time_cache)"
```

### Task 2.3: Migration — RLS policies

**Files:**
- Create: `supabase/migrations/20260429000002_rls.sql`

- [ ] **Step 1: Write RLS migration**

```sql
-- supabase/migrations/20260429000002_rls.sql

alter table public.trip enable row level security;
alter table public.trip_member enable row level security;
alter table public.item enable row level security;
alter table public.attachment enable row level security;
alter table public.travel_time_cache enable row level security;

-- Helper: am I a member of this trip?
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.trip_member
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

-- trip
create policy trip_member_read on public.trip
  for select using (public.is_trip_member(id));

create policy trip_owner_write on public.trip
  for update using (
    exists (
      select 1 from public.trip_member
      where trip_id = trip.id and user_id = auth.uid() and role = 'owner'
    )
  );

create policy trip_insert_self on public.trip
  for insert with check (true);  -- creation is rare; protected by client

-- trip_member
create policy trip_member_read on public.trip_member
  for select using (public.is_trip_member(trip_id));

create policy trip_member_owner_insert on public.trip_member
  for insert with check (
    exists (
      select 1 from public.trip_member
      where trip_id = trip_member.trip_id and user_id = auth.uid() and role = 'owner'
    )
    or not exists (
      -- bootstrap: first member of a trip can be inserted by anyone authenticated
      select 1 from public.trip_member where trip_id = trip_member.trip_id
    )
  );

-- item
create policy item_member_all on public.item
  for all using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- attachment
create policy attachment_member_all on public.attachment
  for all using (
    exists (
      select 1 from public.item i
      where i.id = attachment.item_id and public.is_trip_member(i.trip_id)
    )
  )
  with check (
    exists (
      select 1 from public.item i
      where i.id = attachment.item_id and public.is_trip_member(i.trip_id)
    )
  );

-- travel_time_cache: shared resource, any authed user can read/write
create policy ttc_authed on public.travel_time_cache
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Push**

```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "db: row-level security for trip-scoped access"
```

### Task 2.4: Storage bucket for attachments

- [ ] **Step 1: Via Supabase dashboard (Chrome)**

Storage → New bucket. Name: `trip-attachments`. Public: NO.

- [ ] **Step 2: Add bucket policies (SQL editor)**

Run in Supabase SQL editor:

```sql
create policy "Trip members can read attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'trip-attachments'
  and exists (
    select 1 from public.attachment a
    join public.item i on i.id = a.item_id
    where a.storage_path = storage.objects.name
      and public.is_trip_member(i.trip_id)
  )
);

create policy "Trip members can upload attachments"
on storage.objects for insert to authenticated
with check (bucket_id = 'trip-attachments');

create policy "Trip members can delete their uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trip-attachments'
  and owner = auth.uid()
);
```

### Task 2.5: Seed data — flights, lodging, places

**Files:**
- Create: `supabase/seed.sql`
- Create: `scripts/seed.ts`

The trip and trip_member rows are user-scoped, so we seed via a TS script after Josiah signs in (Phase 3). For now, write the place data as a static module that the seed script consumes.

- [ ] **Step 1: Static seed data**

Create `supabase/seed-data.ts`:

```ts
export type SeedItem = {
  kind: 'flight' | 'lodging' | 'activity' | 'food';
  title: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  sort_order: number;
  address?: string;
  lat?: number;
  lng?: number;
  details: Record<string, unknown>;
};

export const SEED_ITEMS: SeedItem[] = [
  // International flights
  {
    kind: 'flight',
    title: 'BA 243 — London to Mexico City',
    scheduled_date: '2026-05-01',
    start_time: '15:10',
    end_time: '19:45',
    sort_order: 0,
    details: { airline: 'British Airways', number: 'BA 243', from_airport: 'LHR', to_airport: 'MEX', departure_dt: '2026-05-01T15:10:00+01:00', arrival_dt: '2026-05-01T19:45:00-06:00', confirmation: '' },
  },
  {
    kind: 'flight',
    title: 'BA 242 — Mexico City to London',
    scheduled_date: '2026-05-10',
    start_time: '22:00',
    sort_order: 99,
    details: { airline: 'British Airways', number: 'BA 242', from_airport: 'MEX', to_airport: 'LHR', departure_dt: '2026-05-10T22:00:00-06:00', arrival_dt: '2026-05-11T15:30:00+01:00', confirmation: '' },
  },
  // Domestic flights
  {
    kind: 'flight',
    title: 'AM 592 — Mexico City to Tulum',
    scheduled_date: '2026-05-04',
    start_time: '08:40',
    end_time: '11:40',
    sort_order: 0,
    details: { airline: 'Aeroméxico', number: 'AM 592', from_airport: 'MEX', to_airport: 'TQO', departure_dt: '2026-05-04T08:40:00-06:00', arrival_dt: '2026-05-04T11:40:00-05:00', confirmation: 'WVPGOR', price: 225.80 },
  },
  {
    kind: 'flight',
    title: 'VB 7447 — Tulum to Mexico City',
    scheduled_date: '2026-05-06',
    start_time: '16:30',
    end_time: '17:45',
    sort_order: 0,
    details: { airline: 'Vivaaerobus', number: 'VB 7447', from_airport: 'TQO', to_airport: 'MEX', departure_dt: '2026-05-06T16:30:00-05:00', arrival_dt: '2026-05-06T17:45:00-06:00', confirmation: 'SCH4TP' },
  },
  // Lodging
  {
    kind: 'lodging',
    title: 'Tonalá 127 (Mexico City, leg 1)',
    scheduled_date: '2026-05-01',
    sort_order: 50,
    address: 'Tonalá 127, Roma Nte., Cuauhtémoc, 06700 Ciudad de México',
    lat: 19.4178,
    lng: -99.1635,
    details: { check_in_date: '2026-05-01', check_out_date: '2026-05-04', confirmation: '5264985189', price: 529.59, room_name: 'TONALÁ By Mr W' },
  },
  {
    kind: 'lodging',
    title: 'Tago Tulum by G Hotels',
    scheduled_date: '2026-05-04',
    sort_order: 50,
    address: 'Carr. Tulum-Boca Paila km 6.5, Tulum Beach',
    lat: 20.1668,
    lng: -87.4423,
    details: { check_in_date: '2026-05-04', check_out_date: '2026-05-06', confirmation: '5502450241', price: 476.96 },
  },
  {
    kind: 'lodging',
    title: 'Tonalá 127 (Mexico City, leg 2)',
    scheduled_date: '2026-05-06',
    sort_order: 50,
    address: 'Tonalá 127, Roma Nte., Cuauhtémoc, 06700 Ciudad de México',
    lat: 19.4178,
    lng: -99.1635,
    details: { check_in_date: '2026-05-06', check_out_date: '2026-05-09', confirmation: '6053617120' },
  },
  // Activities (wishlist)
  {
    kind: 'activity',
    title: 'Frida Kahlo Museum',
    sort_order: 0,
    address: 'Londres 247, Coyoacán, 04100 CDMX',
    lat: 19.3551,
    lng: -99.1622,
    details: { category: 'Museum', booked: false },
  },
  {
    kind: 'activity',
    title: 'Soho House Mexico City',
    sort_order: 0,
    address: 'Calle Manuel Cervantes 5, Roma Nte., 06700 CDMX',
    lat: 19.4188,
    lng: -99.1620,
    details: { category: 'Social club', booked: false },
  },
  {
    kind: 'activity',
    title: 'Grutas Tolantongo',
    sort_order: 0,
    address: 'Cardonal, Hidalgo',
    lat: 20.6447,
    lng: -98.9963,
    details: { category: 'Outdoor', booked: false },
  },
  // Food (wishlist)
  {
    kind: 'food',
    title: 'Salón Palomilla',
    sort_order: 0,
    address: 'Roma Norte, CDMX',
    lat: 19.4180,
    lng: -99.1610,
    details: { meal_type: 'drinks', cuisine: 'Cocktail bar' },
  },
  {
    kind: 'food',
    title: 'Panadería Rosetta',
    sort_order: 0,
    address: 'Colima 179, Roma Nte., CDMX',
    lat: 19.4196,
    lng: -99.1626,
    details: { meal_type: 'breakfast', cuisine: 'Bakery' },
  },
];

export const TRIP_META = {
  name: 'Mexico May 2026',
  start_date: '2026-05-01',
  end_date: '2026-05-10',
  home_timezone: 'Europe/London',
  destinations: [
    { name: 'Mexico City', tz: 'America/Mexico_City', start_date: '2026-05-01', end_date: '2026-05-04' },
    { name: 'Tulum', tz: 'America/Cancun', start_date: '2026-05-04', end_date: '2026-05-06' },
    { name: 'Mexico City', tz: 'America/Mexico_City', start_date: '2026-05-06', end_date: '2026-05-10' },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add supabase/seed-data.ts
git commit -m "data: seed items for the May 2026 trip"
```

The actual insert script comes after auth (Task 3.5).

---

# Phase 3 — Auth (magic link + invite)

### Task 3.1: Supabase JS clients

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/middleware.ts`
- Modify: `package.json` (add deps)

- [ ] **Step 1: Install deps**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Browser client**

`lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

- [ ] **Step 3: Server client**

`lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {/* read-only context */}
        },
      },
    },
  );
};
```

- [ ] **Step 4: Middleware client + session refresh**

`lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ['/days', '/map', '/wishlist', '/trip'];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 5: Generate types from DB**

```bash
supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```

- [ ] **Step 6: Update root middleware to use auth**

Replace `middleware.ts`:

```ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const TRIP_START = new Date('2026-05-01');
const TRIP_END = new Date('2026-05-10');

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/days/today') {
    const now = new Date();
    let target = now;
    if (now < TRIP_START) target = TRIP_START;
    else if (now > TRIP_END) target = TRIP_END;
    const iso = target.toISOString().slice(0, 10);
    const url = request.nextUrl.clone();
    url.pathname = `/days/${iso}`;
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "auth: supabase clients + protected route middleware"
```

### Task 3.2: Sign-in page

**Files:**
- Create: `app/sign-in/page.tsx`
- Create: `app/sign-in/actions.ts`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Server action — send magic link**

`app/sign-in/actions.ts`:

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email required' };

  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { ok: true };
}
```

- [ ] **Step 2: Sign-in page**

`app/sign-in/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { signInWithEmail } from './actions';

export default function SignInPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await signInWithEmail(formData);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-8 text-center">
        <h1 className="serif text-3xl mb-4">Check your inbox</h1>
        <p className="text-muted">We sent you a sign-in link.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8">
      <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · May 2026</div>
      <h1 className="serif text-4xl mt-2 mb-8">Sign in</h1>
      <form action={onSubmit} className="w-full max-w-sm space-y-4">
        <input
          name="email"
          type="email"
          required
          placeholder="you@somewhere.com"
          className="w-full px-4 py-3 rounded-lg border border-rule bg-bg"
          autoFocus
        />
        <button
          type="submit"
          className="w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold"
        >
          Send magic link
        </button>
        {error && <p className="text-accent-text text-sm">{error}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Auth callback route**

`app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/days/today';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
```

- [ ] **Step 4: Verify in Supabase dashboard**

Authentication → URL Configuration: ensure `http://localhost:3000` is in Site URL allowed origins, and `http://localhost:3000/auth/callback` is in Redirect URLs.

- [ ] **Step 5: Test locally**

```bash
npm run dev
```

Open `localhost:3000/sign-in`, enter `josiah@pubitygroup.com`. Click the link in the email → should land on `/days/2026-05-01` (or similar). Verify auth.users has a row.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "auth: magic link sign-in"
```

### Task 3.3: Trip bootstrap (create trip + owner row on first sign-in)

**Files:**
- Create: `lib/trip/bootstrap.ts`
- Modify: `app/auth/callback/route.ts`

- [ ] **Step 1: Bootstrap helper**

`lib/trip/bootstrap.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { TRIP_META } from '@/supabase/seed-data';

const TRIP_ID = '00000000-0000-0000-0000-000000000001';

export async function ensureTrip(supabase: SupabaseClient<Database>, userId: string) {
  // Idempotent: insert trip if missing, insert membership if missing.
  const { data: existing } = await supabase
    .from('trip')
    .select('id')
    .eq('id', TRIP_ID)
    .maybeSingle();

  if (!existing) {
    const { error: tripErr } = await supabase
      .from('trip')
      .insert({ id: TRIP_ID, ...TRIP_META });
    if (tripErr) throw tripErr;
  }

  await supabase
    .from('trip_member')
    .upsert({ trip_id: TRIP_ID, user_id: userId, role: 'owner' }, { onConflict: 'trip_id,user_id' });

  return TRIP_ID;
}

export const SINGLETON_TRIP_ID = TRIP_ID;
```

- [ ] **Step 2: Call from callback**

Modify `app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { ensureTrip } from '@/lib/trip/bootstrap';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/days/today';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try { await ensureTrip(supabase, data.user.id); } catch (e) { console.error('bootstrap failed', e); }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "auth: bootstrap singleton trip on first sign-in"
```

### Task 3.4: Invite Débora flow

**Files:**
- Create: `app/(app)/trip/invite/page.tsx`
- Create: `app/(app)/trip/invite/actions.ts`

- [ ] **Step 1: Server action — invite via service role**

`app/(app)/trip/invite/actions.ts`:

```ts
'use server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';
import { SINGLETON_TRIP_ID } from '@/lib/trip/bootstrap';
import { headers } from 'next/headers';

export async function inviteUser(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email required' };

  // Caller must be authed and the trip owner
  const userClient = await createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: membership } = await userClient
    .from('trip_member')
    .select('role')
    .eq('trip_id', SINGLETON_TRIP_ID)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membership?.role !== 'owner') return { error: 'Only the owner can invite' };

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const origin = (await headers()).get('origin') ?? 'http://localhost:3000';

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  const userId = invited.user?.id;
  if (userId) {
    await admin.from('trip_member').upsert(
      { trip_id: SINGLETON_TRIP_ID, user_id: userId, role: 'editor' },
      { onConflict: 'trip_id,user_id' },
    );
  }
  return { ok: true };
}
```

- [ ] **Step 2: Invite UI**

`app/(app)/trip/invite/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { inviteUser } from './actions';

export default function InvitePage() {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setStatus('idle');
    setError(null);
    const result = await inviteUser(formData);
    if (result.error) { setError(result.error); setStatus('error'); }
    else setStatus('sent');
  }

  return (
    <main className="p-5">
      <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · invite</div>
      <h1 className="serif text-3xl mt-2 mb-6">Invite Débora</h1>
      <form action={onSubmit} className="space-y-4 max-w-sm">
        <input name="email" type="email" required placeholder="debora@..."
          className="w-full px-4 py-3 rounded-lg border border-rule bg-bg" />
        <button type="submit" className="w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold">
          Send invite
        </button>
        {status === 'sent' && <p className="text-icon-stay">Invite sent.</p>}
        {error && <p className="text-accent-text">{error}</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "auth: invite flow for trip editor"
```

### Task 3.5: Seed runner

**Files:**
- Create: `app/(app)/trip/seed/route.ts`

A one-shot route only Josiah (owner) can call to load the seed data. Idempotent — skips items that already exist by title.

- [ ] **Step 1: Write the route**

`app/(app)/trip/seed/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { SINGLETON_TRIP_ID } from '@/lib/trip/bootstrap';
import { SEED_ITEMS } from '@/supabase/seed-data';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { data: membership } = await supabase
    .from('trip_member').select('role')
    .eq('trip_id', SINGLETON_TRIP_ID).eq('user_id', user.id).maybeSingle();
  if (membership?.role !== 'owner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: existing } = await supabase
    .from('item').select('title').eq('trip_id', SINGLETON_TRIP_ID);
  const existingTitles = new Set((existing ?? []).map((r) => r.title));

  const toInsert = SEED_ITEMS.filter((i) => !existingTitles.has(i.title)).map((i) => ({
    ...i,
    trip_id: SINGLETON_TRIP_ID,
    updated_by: user.id,
  }));
  if (toInsert.length === 0) return NextResponse.json({ inserted: 0 });

  const { error } = await supabase.from('item').insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: toInsert.length });
}
```

- [ ] **Step 2: Run it once**

After signing in, hit the route from your phone or curl:

```bash
curl -X POST http://localhost:3000/trip/seed --cookie "$(... session cookies ...)"
```

Easier: temporarily add a button to the Trip page to call it:

```tsx
// app/(app)/trip/page.tsx (add)
'use client';
import { useState } from 'react';
export default function TripPage() {
  const [status, setStatus] = useState('');
  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">Trip</h1>
      <button onClick={async () => {
        const r = await fetch('/trip/seed', { method: 'POST' });
        setStatus(await r.text());
      }} className="px-4 py-2 bg-accent text-white rounded">Seed data</button>
      <pre>{status}</pre>
    </main>
  );
}
```

After running once, remove the button (or leave it for now; we'll redo this page properly in Phase 7).

- [ ] **Step 3: Verify seed**

Supabase Table Editor → `item` → 12 rows for `trip_id = 00000000-...-0001`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "data: one-shot seed loader"
```

---

# Phase 4 — Data layer (server, client, Dexie mirror, write queue)

### Task 4.1: Domain types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Domain types**

`lib/types.ts`:

```ts
export type ItemKind = 'flight' | 'lodging' | 'activity' | 'food';

export type FlightDetails = {
  airline?: string;
  number?: string;
  from_airport?: string;
  to_airport?: string;
  departure_dt?: string;
  arrival_dt?: string;
  confirmation?: string;
  price?: number;
};

export type LodgingDetails = {
  check_in_date?: string;
  check_out_date?: string;
  confirmation?: string;
  price?: number;
  room_name?: string;
};

export type ActivityDetails = {
  category?: string;
  booked?: boolean;
  price?: number;
  link?: string;
};

export type FoodDetails = {
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | string;
  reservation_at?: string;
  link?: string;
  cuisine?: string;
};

export type Item = {
  id: string;
  trip_id: string;
  kind: ItemKind;
  title: string;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  mapbox_place_id: string | null;
  photo_url: string | null;
  opening_hours: OpeningHours | null;
  details: FlightDetails | LodgingDetails | ActivityDetails | FoodDetails;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type OpeningHours = {
  // OSM-style: array of 7 day specs (0 = Mon)
  weekly: Array<null | { open: string; close: string }>;
  exceptions?: Record<string, null | { open: string; close: string }>;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "types: domain types for items"
```

### Task 4.2: Dexie schema

**Files:**
- Modify: `package.json`
- Create: `lib/db/dexie.ts`

- [ ] **Step 1: Install Dexie**

```bash
npm install dexie dexie-react-hooks
```

- [ ] **Step 2: Schema**

`lib/db/dexie.ts`:

```ts
import Dexie, { type Table } from 'dexie';
import type { Item } from '@/lib/types';

export type WriteQueueEntry = {
  id?: number;
  op: 'insert' | 'update' | 'delete';
  table: 'item' | 'attachment';
  payload: Record<string, unknown>;
  attempts: number;
  enqueued_at: number;
};

class TripDB extends Dexie {
  item!: Table<Item, string>;
  write_queue!: Table<WriteQueueEntry, number>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('mexico-trip');
    this.version(1).stores({
      item: 'id, trip_id, scheduled_date, kind, [trip_id+scheduled_date]',
      write_queue: '++id, enqueued_at',
      meta: 'key',
    });
  }
}

export const db = new TripDB();
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "db: dexie schema for offline mirror"
```

### Task 4.3: Item repository (server reads)

**Files:**
- Create: `lib/items/server.ts`

- [ ] **Step 1: Server-side fetchers**

`lib/items/server.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { SINGLETON_TRIP_ID } from '@/lib/trip/bootstrap';
import type { Item } from '@/lib/types';

export async function getItemsForDay(date: string): Promise<Item[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('item')
    .select('*')
    .eq('trip_id', SINGLETON_TRIP_ID)
    .eq('scheduled_date', date)
    .order('sort_order', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function getAllItems(): Promise<Item[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('item').select('*').eq('trip_id', SINGLETON_TRIP_ID);
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function getWishlistItems(): Promise<Item[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('item').select('*').eq('trip_id', SINGLETON_TRIP_ID).is('scheduled_date', null);
  if (error) throw error;
  return (data ?? []) as Item[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/items/server.ts
git commit -m "data: server-side item fetchers"
```

### Task 4.4: Item store (client, Dexie-backed)

**Files:**
- Create: `lib/items/store.ts`
- Create: `lib/items/sync.ts`

- [ ] **Step 1: Client store**

`lib/items/store.ts`:

```ts
'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import type { Item } from '@/lib/types';

export function useDayItems(date: string): Item[] | undefined {
  return useLiveQuery(
    () => db.item
      .where('[trip_id+scheduled_date]')
      .equals([SINGLETON_TRIP_ID_CLIENT, date])
      .sortBy('sort_order'),
    [date],
  );
}

export function useWishlistItems(): Item[] | undefined {
  return useLiveQuery(
    () => db.item.where('scheduled_date').equals('NULL_SENTINEL').or('scheduled_date').equals(null as any).sortBy('title'),
    [],
  );
}

export function useAllItems(): Item[] | undefined {
  return useLiveQuery(() => db.item.toArray(), []);
}

// Single-trip app: this is the same UUID as SINGLETON_TRIP_ID on the server
export const SINGLETON_TRIP_ID_CLIENT = '00000000-0000-0000-0000-000000000001';
```

Note: Dexie can't index `null` values directly. Workaround in next step.

- [ ] **Step 2: Wishlist helper that handles nulls**

Update `lib/items/store.ts` to use a runtime filter:

```ts
export function useWishlistItems(): Item[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.item.where('trip_id').equals(SINGLETON_TRIP_ID_CLIENT).toArray();
    return all.filter((i) => i.scheduled_date === null).sort((a, b) => a.title.localeCompare(b.title));
  }, []);
}
```

- [ ] **Step 3: Initial hydration from server**

`lib/items/sync.ts`:

```ts
'use client';
import { db } from '@/lib/db/dexie';
import { createClient } from '@/lib/supabase/browser';
import { SINGLETON_TRIP_ID_CLIENT } from './store';
import type { Item } from '@/lib/types';

export async function hydrateFromServer() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('item').select('*').eq('trip_id', SINGLETON_TRIP_ID_CLIENT);
  if (error) throw error;
  await db.transaction('rw', db.item, async () => {
    await db.item.clear();
    await db.item.bulkPut((data ?? []) as Item[]);
  });
  await db.meta.put({ key: 'hydrated_at', value: Date.now() });
}
```

- [ ] **Step 4: Hydration provider**

`components/HydrationProvider.tsx`:

```tsx
'use client';
import { useEffect } from 'react';
import { hydrateFromServer } from '@/lib/items/sync';

export default function HydrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateFromServer().catch((e) => console.error('hydrate failed', e));
  }, []);
  return <>{children}</>;
}
```

Wire into `app/(app)/layout.tsx`:

```tsx
import BottomNav from '@/components/BottomNav';
import HydrationProvider from '@/components/HydrationProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HydrationProvider>
      <div className="min-h-dvh pb-[88px]">{children}<BottomNav /></div>
    </HydrationProvider>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "data: client-side dexie store and hydration"
```

### Task 4.5: Mutations + write queue

**Files:**
- Create: `lib/items/mutate.ts`

- [ ] **Step 1: Mutation API**

`lib/items/mutate.ts`:

```ts
'use client';
import { db } from '@/lib/db/dexie';
import { createClient } from '@/lib/supabase/browser';
import { SINGLETON_TRIP_ID_CLIENT } from './store';
import type { Item } from '@/lib/types';

type ItemPatch = Partial<Omit<Item, 'id' | 'trip_id' | 'created_at' | 'updated_at'>>;

export async function updateItem(id: string, patch: ItemPatch) {
  const existing = await db.item.get(id);
  if (!existing) throw new Error(`item ${id} not in cache`);
  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
  await db.item.put(updated);

  await db.write_queue.add({
    op: 'update', table: 'item',
    payload: { id, ...patch },
    attempts: 0, enqueued_at: Date.now(),
  });

  void flushQueue();
}

export async function insertItem(item: Omit<Item, 'created_at' | 'updated_at'>) {
  const now = new Date().toISOString();
  const full: Item = { ...item, created_at: now, updated_at: now };
  await db.item.put(full);
  await db.write_queue.add({
    op: 'insert', table: 'item', payload: full,
    attempts: 0, enqueued_at: Date.now(),
  });
  void flushQueue();
}

export async function deleteItem(id: string) {
  await db.item.delete(id);
  await db.write_queue.add({
    op: 'delete', table: 'item', payload: { id },
    attempts: 0, enqueued_at: Date.now(),
  });
  void flushQueue();
}

let flushing = false;
export async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    const supabase = createClient();
    while (true) {
      const next = await db.write_queue.orderBy('enqueued_at').first();
      if (!next) break;
      try {
        if (next.op === 'insert' && next.table === 'item') {
          await supabase.from('item').insert(next.payload as never);
        } else if (next.op === 'update' && next.table === 'item') {
          const { id, ...rest } = next.payload as { id: string };
          await supabase.from('item').update(rest as never).eq('id', id);
        } else if (next.op === 'delete' && next.table === 'item') {
          await supabase.from('item').delete().eq('id', (next.payload as { id: string }).id);
        }
        await db.write_queue.delete(next.id!);
      } catch (err) {
        if (next.attempts >= 5) {
          console.error('giving up on write', next, err);
          await db.write_queue.delete(next.id!);
        } else {
          await db.write_queue.update(next.id!, { attempts: next.attempts + 1 });
          await new Promise((r) => setTimeout(r, 1000 * (next.attempts + 1)));
        }
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue());
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/items/mutate.ts
git commit -m "data: optimistic mutations with offline write queue"
```

### Task 4.6: Test for write queue (the one rigorous test)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/items/__tests__/mutate.test.ts`

The write queue is the highest-risk piece (data loss potential). Tests are worth it.

- [ ] **Step 1: Install vitest + jsdom**

```bash
npm install -D vitest @vitest/ui jsdom fake-indexeddb
```

- [ ] **Step 2: Vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, './') } },
});
```

`vitest.setup.ts`:

```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 3: Test**

`lib/items/__tests__/mutate.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db/dexie';
import { updateItem } from '@/lib/items/mutate';
import type { Item } from '@/lib/types';

const sample: Item = {
  id: 'a', trip_id: '00000000-0000-0000-0000-000000000001',
  kind: 'activity', title: 'X', scheduled_date: '2026-05-04',
  start_time: null, end_time: null, sort_order: 0,
  address: null, lat: null, lng: null, mapbox_place_id: null,
  photo_url: null, opening_hours: null, details: {},
  created_at: '2026-04-29T00:00:00Z', updated_at: '2026-04-29T00:00:00Z',
  updated_by: null,
};

describe('updateItem', () => {
  beforeEach(async () => {
    await db.item.clear();
    await db.write_queue.clear();
    await db.item.put(sample);
  });

  it('writes optimistically to dexie', async () => {
    vi.mock('@/lib/supabase/browser', () => ({ createClient: () => ({ from: () => ({ update: () => ({ eq: async () => ({}) }) }) }) }));
    await updateItem('a', { title: 'Y' });
    const after = await db.item.get('a');
    expect(after?.title).toBe('Y');
  });

  it('enqueues a write_queue entry', async () => {
    vi.mock('@/lib/supabase/browser', () => ({ createClient: () => ({ from: () => ({ update: () => ({ eq: async () => ({}) }) }) }) }));
    await updateItem('a', { sort_order: 5 });
    const entries = await db.write_queue.toArray();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].op).toBe('update');
  });
});
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: write queue optimistic + enqueue"
```

---

# Phase 5 — Realtime sync + presence

### Task 5.1: Subscribe to item changes

**Files:**
- Create: `lib/items/realtime.ts`
- Modify: `components/HydrationProvider.tsx`

- [ ] **Step 1: Realtime subscription**

`lib/items/realtime.ts`:

```ts
'use client';
import { db } from '@/lib/db/dexie';
import { createClient } from '@/lib/supabase/browser';
import { SINGLETON_TRIP_ID_CLIENT } from './store';
import type { Item } from '@/lib/types';

export function subscribeToItems() {
  const supabase = createClient();
  const channel = supabase
    .channel(`trip:${SINGLETON_TRIP_ID_CLIENT}:item`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'item', filter: `trip_id=eq.${SINGLETON_TRIP_ID_CLIENT}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { id: string };
          if (oldRow?.id) void db.item.delete(oldRow.id);
        } else {
          const newRow = payload.new as Item;
          void db.item.put(newRow);
        }
      },
    )
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}
```

- [ ] **Step 2: Wire into HydrationProvider**

```tsx
'use client';
import { useEffect } from 'react';
import { hydrateFromServer } from '@/lib/items/sync';
import { subscribeToItems } from '@/lib/items/realtime';
import { flushQueue } from '@/lib/items/mutate';

export default function HydrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateFromServer().catch(console.error);
    flushQueue();
    return subscribeToItems();
  }, []);
  return <>{children}</>;
}
```

- [ ] **Step 3: Verify in two browser tabs**

Open two windows logged in. Edit an item title in one (we'll have UI in Phase 6, for now run from devtools console: `(await import('/_next/static/chunks/...')).updateItem(...)` — easier: do this verification after Phase 6).

Mark this task as "verify-later" and commit.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "sync: realtime subscription patches dexie"
```

### Task 5.2: Presence (avatar dot)

**Files:**
- Create: `lib/presence/usePresence.ts`
- Create: `components/Avatars.tsx`

- [ ] **Step 1: Presence hook**

`lib/presence/usePresence.ts`:

```ts
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { SINGLETON_TRIP_ID_CLIENT } from '@/lib/items/store';

export type PresenceState = { user_id: string; email: string; online_at: string };

export function usePresence(currentUserId: string | undefined) {
  const [others, setOthers] = useState<PresenceState[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`trip:${SINGLETON_TRIP_ID_CLIENT}:presence`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const list: PresenceState[] = [];
        for (const [key, metas] of Object.entries(state)) {
          if (key === currentUserId) continue;
          if (metas[0]) list.push(metas[0] as PresenceState);
        }
        setOthers(list);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUserId, email: '', online_at: new Date().toISOString() });
        }
      });

    return () => { void supabase.removeChannel(channel); };
  }, [currentUserId]);

  return others;
}
```

- [ ] **Step 2: Avatars component**

`components/Avatars.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { usePresence } from '@/lib/presence/usePresence';

function initial(email: string) { return email[0]?.toUpperCase() ?? '?'; }

export default function Avatars() {
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setMe({ id: data.user.id, email: data.user.email ?? '' });
    });
  }, []);
  const others = usePresence(me?.id);

  return (
    <div className="flex">
      {others.map((o) => (
        <div key={o.user_id}
             className="relative w-[26px] h-[26px] rounded-full bg-icon-stay text-white text-[11px] font-bold flex items-center justify-center border-2 border-bg">
          {initial(o.email)}
          <span className="absolute -bottom-0 -right-0 w-2 h-2 rounded-full bg-icon-stay border border-bg" />
        </div>
      ))}
      {me && (
        <div className="relative w-[26px] h-[26px] rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center border-2 border-bg -ml-2">
          {initial(me.email)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "sync: presence avatars with online dot"
```

---

# Phase 6 — Days view (timeline + drag-sort)

### Task 6.1: Day strip + day route

**Files:**
- Create: `components/DayStrip.tsx`
- Create: `lib/dates.ts`
- Modify: `app/(app)/days/[date]/page.tsx`

- [ ] **Step 1: Date helpers**

`lib/dates.ts`:

```ts
export const TRIP_START = '2026-05-01';
export const TRIP_END = '2026-05-10';

export function tripDays(): string[] {
  const out: string[] = [];
  const start = new Date(TRIP_START);
  const end = new Date(TRIP_END);
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function shortDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getUTCDay()];
  return `${wd}${d.getUTCDate()}`;
}

export function longDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  return `${wd} ${d.getUTCDate()} ${mo}`;
}

export function dayIndex(iso: string): number {
  const days = tripDays();
  return days.indexOf(iso);
}
```

- [ ] **Step 2: DayStrip**

`components/DayStrip.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { tripDays, shortDay } from '@/lib/dates';

export default function DayStrip({ active }: { active: string }) {
  return (
    <div className="flex gap-[6px] px-5 pb-3 overflow-x-auto no-scrollbar">
      {tripDays().map((d) => {
        const isActive = d === active;
        return (
          <Link key={d} href={`/days/${d}`}
            className={`flex-shrink-0 px-[10px] py-[6px] rounded-[14px] text-[11px] font-semibold ${
              isActive ? 'bg-accent text-white' : 'bg-black/5 text-ink'
            }`}>
            {shortDay(d)}
          </Link>
        );
      })}
    </div>
  );
}
```

Add no-scrollbar utility to `globals.css`:

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
```

- [ ] **Step 3: Day page (server component)**

`app/(app)/days/[date]/page.tsx`:

```tsx
import { tripDays, longDay, dayIndex } from '@/lib/dates';
import DayStrip from '@/components/DayStrip';
import DayTimeline from '@/components/DayTimeline';
import Avatars from '@/components/Avatars';
import { notFound } from 'next/navigation';

export default async function DaysPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!tripDays().includes(date)) notFound();
  const idx = dayIndex(date);

  return (
    <main>
      <div className="flex justify-between items-center px-5 pt-4 pb-2">
        <div className="text-[10px] uppercase tracking-[1.5px] text-muted">
          Mexico · Day {idx + 1} of 10
        </div>
        <Avatars />
      </div>
      <h1 className="serif font-normal text-[26px] leading-tight px-5 pb-2">{longDay(date)}</h1>
      <DayStrip active={date} />
      <DayTimeline date={date} />
    </main>
  );
}
```

- [ ] **Step 4: DayTimeline placeholder**

`components/DayTimeline.tsx`:

```tsx
'use client';
import { useDayItems } from '@/lib/items/store';
import ItemRow from '@/components/ItemRow';

export default function DayTimeline({ date }: { date: string }) {
  const items = useDayItems(date);
  if (!items) return <div className="px-5 text-muted text-sm">Loading…</div>;
  if (items.length === 0) return <div className="px-5 text-muted text-sm">Nothing scheduled. Tap + to add.</div>;
  return (
    <div className="px-5">
      {items.map((item) => <ItemRow key={item.id} item={item} />)}
    </div>
  );
}
```

- [ ] **Step 5: ItemRow**

`components/ItemRow.tsx`:

```tsx
'use client';
import Link from 'next/link';
import type { Item } from '@/lib/types';

const ICON: Record<Item['kind'], { glyph: string; bg: string }> = {
  flight: { glyph: '✈', bg: 'bg-icon-fly' },
  lodging: { glyph: '⌂', bg: 'bg-icon-stay' },
  activity: { glyph: '◯', bg: 'bg-icon-see' },
  food: { glyph: '▼', bg: 'bg-icon-eat' },
};

export default function ItemRow({ item }: { item: Item }) {
  const i = ICON[item.kind];
  const time = item.start_time?.slice(0, 5) ?? '';
  return (
    <Link href={`/item/${item.id}`} className="flex gap-[14px] py-[14px] border-t border-rule first:border-t-0">
      <div className="flex flex-col items-center w-[42px] flex-shrink-0">
        <div className="text-[11px] font-bold tracking-[-0.3px]">{time}</div>
        <div className={`w-7 h-7 rounded-full mt-[6px] flex items-center justify-center text-white text-xs ${i.bg}`}>{i.glyph}</div>
      </div>
      <div className="flex-1">
        <div className="serif font-semibold text-[15px] leading-tight">{item.title}</div>
        <div className="text-[11px] text-muted mt-[3px]">{itemMeta(item)}</div>
      </div>
    </Link>
  );
}

function itemMeta(item: Item): string {
  if (item.kind === 'flight') {
    const d = item.details as Record<string, string | undefined>;
    return `${d.number ?? ''} · ${d.from_airport ?? ''} → ${d.to_airport ?? ''}${d.confirmation ? ` · conf ${d.confirmation}` : ''}`;
  }
  if (item.kind === 'lodging') return `${item.address ?? ''}`;
  if (item.kind === 'food') {
    const d = item.details as Record<string, string | undefined>;
    return `${d.cuisine ?? 'Restaurant'}${d.meal_type ? ` · ${d.meal_type}` : ''}`;
  }
  const d = item.details as Record<string, string | undefined>;
  return d.category ?? 'Activity';
}
```

- [ ] **Step 6: Verify**

```bash
npm run dev
```

Sign in, navigate to a day with items (e.g. `/days/2026-05-01`) — should render the day page with seeded flight + lodging.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: days timeline view rendering items"
```

### Task 6.2: Drag-to-reorder within a day

**Files:**
- Modify: `package.json`
- Modify: `components/DayTimeline.tsx`
- Create: `components/SortableItemRow.tsx`

- [ ] **Step 1: Install dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: SortableItemRow**

`components/SortableItemRow.tsx`:

```tsx
'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ItemRow from './ItemRow';
import type { Item } from '@/lib/types';

export default function SortableItemRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ItemRow item={item} />
    </div>
  );
}
```

- [ ] **Step 3: Wire DnD context into DayTimeline**

```tsx
'use client';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDayItems } from '@/lib/items/store';
import { updateItem } from '@/lib/items/mutate';
import SortableItemRow from './SortableItemRow';

export default function DayTimeline({ date }: { date: string }) {
  const items = useDayItems(date);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }));

  if (!items) return <div className="px-5 text-muted text-sm">Loading…</div>;
  if (items.length === 0) return <div className="px-5 text-muted text-sm">Nothing scheduled. Tap + to add.</div>;

  async function onDragEnd(e: DragEndEvent) {
    if (!items) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx);
    await Promise.all(reordered.map((it, i) =>
      it.sort_order === i ? null : updateItem(it.id, { sort_order: i })
    ));
  }

  return (
    <div className="px-5">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => <SortableItemRow key={item.id} item={item} />)}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 4: Verify reorder**

Long-press an item, drag, release. Refresh page — order should stick (writes have flushed to Supabase).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: drag-to-reorder items within a day"
```

---

# Phase 7 — Item detail + edit + attachments

### Task 7.1: Item detail page

**Files:**
- Create: `app/(app)/item/[id]/page.tsx`
- Create: `components/ItemDetail.tsx`
- Create: `components/ItemHero.tsx`

- [ ] **Step 1: Detail page**

`app/(app)/item/[id]/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ItemDetail from '@/components/ItemDetail';
import type { Item } from '@/lib/types';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('item').select('*').eq('id', id).maybeSingle();
  if (error || !data) notFound();
  return <ItemDetail item={data as Item} />;
}
```

- [ ] **Step 2: ItemDetail**

`components/ItemDetail.tsx`:

```tsx
'use client';
import Link from 'next/link';
import type { Item } from '@/lib/types';
import { longDay } from '@/lib/dates';
import ItemHero from './ItemHero';

const KIND_LABEL: Record<Item['kind'], string> = {
  flight: 'FLY', lodging: 'STAY', activity: 'SEE', food: 'EAT',
};

export default function ItemDetail({ item }: { item: Item }) {
  return (
    <main>
      <ItemHero item={item} />
      <div className="px-5 -mt-2">
        <h1 className="serif text-[24px] font-semibold pb-2">{item.title}</h1>
        <div className="flex gap-[10px] flex-wrap mb-[14px] text-[11px] text-muted">
          {item.address && <div>⌖ {item.address}</div>}
        </div>

        <Field label="When" value={whenString(item)} />
        {item.kind === 'flight' && <FlightFields item={item} />}
        {item.kind === 'lodging' && <LodgingFields item={item} />}
        {item.kind === 'food' && <FoodFields item={item} />}
        {item.kind === 'activity' && <ActivityFields item={item} />}

        <div className="mt-6">
          <Link href={`/item/${item.id}/edit`} className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
            Edit
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="border-t border-rule py-[10px]">
      <div className="text-[9px] tracking-[1.5px] uppercase text-muted mb-[3px]">{label}</div>
      <div className="text-[13px] font-medium">{value}</div>
    </div>
  );
}

function whenString(item: Item): string | null {
  if (!item.scheduled_date) return 'Wishlist (unscheduled)';
  const time = item.start_time ? ` · ${item.start_time.slice(0,5)}${item.end_time ? `—${item.end_time.slice(0,5)}` : ''}` : '';
  return `${longDay(item.scheduled_date)}${time}`;
}

function FlightFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | number | undefined>;
  return (
    <>
      <Field label="Flight" value={`${d.airline ?? ''} ${d.number ?? ''}`} />
      <Field label="Route" value={`${d.from_airport ?? ''} → ${d.to_airport ?? ''}`} />
      <Field label="Confirmation" value={String(d.confirmation ?? '')} />
      {d.price && <Field label="Price" value={`£${d.price}`} />}
    </>
  );
}
function LodgingFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | number | undefined>;
  return (
    <>
      <Field label="Check-in / out" value={`${d.check_in_date ?? ''} → ${d.check_out_date ?? ''}`} />
      <Field label="Confirmation" value={String(d.confirmation ?? '')} />
      {d.price && <Field label="Price" value={`$${d.price}`} />}
      {d.room_name && <Field label="Room" value={String(d.room_name)} />}
    </>
  );
}
function FoodFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | undefined>;
  return (
    <>
      <Field label="Cuisine" value={d.cuisine ?? null} />
      <Field label="Meal" value={d.meal_type ?? null} />
      {d.link && <Field label="Link" value={d.link} />}
    </>
  );
}
function ActivityFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | boolean | undefined>;
  return (
    <>
      <Field label="Type" value={d.category as string ?? null} />
      <Field label="Booked" value={d.booked ? 'Yes' : 'No'} />
    </>
  );
}
```

- [ ] **Step 3: Hero**

`components/ItemHero.tsx`:

```tsx
import type { Item } from '@/lib/types';

const HERO_GRADIENT: Record<Item['kind'], string> = {
  flight:   'from-accent to-[#e8a679]',
  lodging:  'from-icon-stay to-[#8aa890]',
  activity: 'from-icon-see to-[#e8c878]',
  food:     'from-icon-eat to-[#c08560]',
};
const KIND_LABEL: Record<Item['kind'], string> = {
  flight: 'FLY', lodging: 'STAY', activity: 'SEE', food: 'EAT',
};

export default function ItemHero({ item }: { item: Item }) {
  return (
    <div className={`h-[200px] bg-gradient-to-br ${HERO_GRADIENT[item.kind]} relative`}
         style={item.photo_url ? { backgroundImage: `url(${item.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      <div className="absolute bottom-3 left-4 bg-ink/85 text-bg px-[10px] py-[4px] rounded-[12px] text-[9px] font-bold uppercase tracking-[1px]">
        {KIND_LABEL[item.kind]}{item.scheduled_date ? ` · ${item.scheduled_date}` : ''}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Tap an item from Days → detail page renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: item detail page"
```

### Task 7.2: Edit sheet

**Files:**
- Create: `app/(app)/item/[id]/edit/page.tsx`
- Create: `components/ItemEditForm.tsx`

- [ ] **Step 1: Edit page**

`app/(app)/item/[id]/edit/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ItemEditForm from '@/components/ItemEditForm';
import type { Item } from '@/lib/types';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('item').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <ItemEditForm item={data as Item} />;
}
```

- [ ] **Step 2: Edit form (kind-aware)**

`components/ItemEditForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateItem } from '@/lib/items/mutate';
import { tripDays } from '@/lib/dates';
import type { Item } from '@/lib/types';

export default function ItemEditForm({ item }: { item: Item }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [date, setDate] = useState(item.scheduled_date ?? '');
  const [start, setStart] = useState(item.start_time ?? '');
  const [end, setEnd] = useState(item.end_time ?? '');
  const [address, setAddress] = useState(item.address ?? '');
  const [details, setDetails] = useState(JSON.stringify(item.details, null, 2));

  async function save() {
    let parsedDetails: Record<string, unknown> = {};
    try { parsedDetails = JSON.parse(details); } catch { alert('Details must be valid JSON'); return; }
    await updateItem(item.id, {
      title,
      scheduled_date: date || null,
      start_time: start || null,
      end_time: end || null,
      address: address || null,
      details: parsedDetails as Item['details'],
    });
    router.push(`/item/${item.id}`);
  }

  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">Edit</h1>
      <div className="space-y-3 max-w-md">
        <Labelled label="Title">
          <input className="w-full px-3 py-2 rounded border border-rule bg-bg" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Labelled>
        <Labelled label="Date">
          <select className="w-full px-3 py-2 rounded border border-rule bg-bg" value={date} onChange={(e) => setDate(e.target.value)}>
            <option value="">— Wishlist —</option>
            {tripDays().map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Labelled>
        <div className="flex gap-2">
          <Labelled label="Start"><input type="time" className="w-full px-3 py-2 rounded border border-rule bg-bg" value={start} onChange={(e) => setStart(e.target.value)} /></Labelled>
          <Labelled label="End"><input type="time" className="w-full px-3 py-2 rounded border border-rule bg-bg" value={end} onChange={(e) => setEnd(e.target.value)} /></Labelled>
        </div>
        <Labelled label="Address">
          <input className="w-full px-3 py-2 rounded border border-rule bg-bg" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Labelled>
        <Labelled label={`Details (JSON, ${item.kind})`}>
          <textarea className="w-full px-3 py-2 rounded border border-rule bg-bg font-mono text-xs h-40" value={details} onChange={(e) => setDetails(e.target.value)} />
        </Labelled>

        <div className="flex gap-2 pt-2">
          <button onClick={save} className="px-4 py-2 rounded bg-accent text-white font-semibold">Save</button>
          <button onClick={() => router.back()} className="px-4 py-2 rounded border border-rule">Cancel</button>
        </div>
      </div>
    </main>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-[1.5px] text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}
```

- [ ] **Step 3: Add new-item flow**

`app/(app)/item/new/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { insertItem } from '@/lib/items/mutate';
import { SINGLETON_TRIP_ID_CLIENT } from '@/lib/items/store';
import { tripDays } from '@/lib/dates';

export default function NewItemPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialDate = sp.get('date') ?? '';
  const [kind, setKind] = useState<'activity' | 'food' | 'flight' | 'lodging'>('activity');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);

  async function create() {
    const id = crypto.randomUUID();
    await insertItem({
      id, trip_id: SINGLETON_TRIP_ID_CLIENT, kind, title,
      scheduled_date: date || null, start_time: null, end_time: null, sort_order: 0,
      address: null, lat: null, lng: null, mapbox_place_id: null,
      photo_url: null, opening_hours: null, details: {}, updated_by: null,
    });
    router.push(`/item/${id}/edit`);
  }

  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">New item</h1>
      <div className="space-y-3 max-w-md">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}
                className="w-full px-3 py-2 rounded border border-rule bg-bg">
          <option value="activity">Activity</option>
          <option value="food">Food / Drink</option>
          <option value="flight">Flight</option>
          <option value="lodging">Lodging</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
               className="w-full px-3 py-2 rounded border border-rule bg-bg" />
        <select value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-rule bg-bg">
          <option value="">— Wishlist —</option>
          {tripDays().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={create} className="px-4 py-2 rounded bg-accent text-white font-semibold">Create</button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Floating + button on Days view**

In `app/(app)/days/[date]/page.tsx`, add:

```tsx
<Link href={`/item/new?date=${date}`}
      className="fixed bottom-[100px] right-5 w-14 h-14 rounded-full bg-accent text-white text-2xl flex items-center justify-center shadow-lg z-40">
  +
</Link>
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: edit and create item flows"
```

### Task 7.3: Attachments (PDF/photo upload)

**Files:**
- Create: `components/Attachments.tsx`
- Create: `lib/attachments/upload.ts`
- Modify: `components/ItemDetail.tsx`

- [ ] **Step 1: Upload helper**

`lib/attachments/upload.ts`:

```ts
'use client';
import { createClient } from '@/lib/supabase/browser';
import { db } from '@/lib/db/dexie';

export async function uploadAttachment(itemId: string, file: File): Promise<{ id: string; url: string } | { error: string }> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${itemId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('trip-attachments').upload(path, file);
  if (upErr) return { error: upErr.message };
  const kind = file.type === 'application/pdf' ? 'pdf' : 'image';
  const { data, error } = await supabase.from('attachment').insert({
    item_id: itemId, kind, storage_path: path, filename: file.name,
  }).select('id').single();
  if (error || !data) return { error: error?.message ?? 'insert failed' };

  const { data: signed } = await supabase.storage.from('trip-attachments').createSignedUrl(path, 60 * 60 * 24 * 7);
  return { id: data.id, url: signed?.signedUrl ?? '' };
}

export async function listAttachments(itemId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('attachment').select('*').eq('item_id', itemId);
  if (!data) return [];
  return Promise.all(data.map(async (a) => {
    const { data: signed } = await supabase.storage.from('trip-attachments').createSignedUrl(a.storage_path, 60 * 60 * 24 * 7);
    return { ...a, url: signed?.signedUrl ?? '' };
  }));
}
```

- [ ] **Step 2: Attachments component**

`components/Attachments.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { uploadAttachment, listAttachments } from '@/lib/attachments/upload';

type Att = { id: string; kind: string; filename: string; url: string };

export default function Attachments({ itemId }: { itemId: string }) {
  const [items, setItems] = useState<Att[]>([]);
  useEffect(() => { listAttachments(itemId).then((r) => setItems(r as Att[])); }, [itemId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = await uploadAttachment(itemId, f);
    if ('error' in r) { alert(r.error); return; }
    setItems((prev) => [...prev, { id: r.id, kind: f.type === 'application/pdf' ? 'pdf' : 'image', filename: f.name, url: r.url }]);
  }

  return (
    <div className="border-t border-rule py-[10px]">
      <div className="text-[9px] tracking-[1.5px] uppercase text-muted mb-[6px]">Attachments</div>
      <div className="space-y-2">
        {items.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
             className="flex items-center gap-2 text-[13px]">
            <span className="bg-accent text-white px-[6px] py-[2px] rounded-[3px] text-[9px] uppercase font-bold">{a.kind}</span>
            <span className="underline">{a.filename}</span>
          </a>
        ))}
      </div>
      <label className="inline-block mt-3 px-3 py-1.5 rounded border border-rule text-xs cursor-pointer">
        + Add file
        <input type="file" hidden accept="application/pdf,image/*" onChange={onUpload} />
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Mount in ItemDetail**

Insert into `ItemDetail.tsx` after the structured fields:

```tsx
<Attachments itemId={item.id} />
```

- [ ] **Step 4: Verify upload**

Add a PDF on an item, refresh page → it appears with signed URL.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: attachment upload + list with signed urls"
```

---

# Phase 8 — Map view

### Task 8.1: Mapbox base map

**Files:**
- Modify: `package.json`
- Create: `app/(app)/map/page.tsx` (replace stub)
- Create: `components/MapView.tsx`

- [ ] **Step 1: Install Mapbox**

```bash
npm install mapbox-gl
npm install -D @types/mapbox-gl
```

- [ ] **Step 2: Map page**

`app/(app)/map/page.tsx`:

```tsx
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
export default function MapPage() { return <MapView />; }
```

- [ ] **Step 3: MapView**

`components/MapView.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAllItems } from '@/lib/items/store';
import { tripDays } from '@/lib/dates';
import type { Item } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STYLE = 'mapbox://styles/mapbox/light-v11'; // can swap to a custom Editorial Warm style later

export default function MapView() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const allItems = useAllItems();
  const [filter, setFilter] = useState<string>('today');
  const [selected, setSelected] = useState<Item | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: STYLE,
      center: [-99.1635, 19.4178],
      zoom: 11,
    });
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !allItems) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    let visible = allItems.filter((i) => i.lat != null && i.lng != null);
    if (filter === 'wishlist') visible = visible.filter((i) => i.scheduled_date === null);
    else if (filter !== 'all') {
      // filter is an ISO date or 'today' (already redirected by Days middleware)
      const date = filter === 'today' ? tripDays()[0] : filter;
      visible = visible.filter((i) => i.scheduled_date === date);
    }

    const ordered = visible.slice().sort((a, b) => a.sort_order - b.sort_order);

    ordered.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'pin-marker';
      el.style.cssText = `
        width: 26px; height: 26px; border-radius: 50%;
        background: #c45f3c; color: white; font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        border: 3px solid #faf5ee; box-shadow: 0 3px 6px rgba(0,0,0,0.25);
        cursor: pointer;
      `;
      el.textContent = String(idx + 1);
      el.onclick = () => setSelected(item);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([item.lng!, item.lat!])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (ordered.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      ordered.forEach((i) => bounds.extend([i.lng!, i.lat!]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }, [allItems, filter]);

  return (
    <div className="relative h-[calc(100dvh-88px)]">
      <div ref={mapEl} className="absolute inset-0" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg rounded-[18px] px-4 py-2 text-[11px] font-semibold shadow">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent">
          <option value="today">Today</option>
          <option value="all">Whole trip</option>
          <option value="wishlist">Wishlist only</option>
          {tripDays().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {selected && <PinCard item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PinCard({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-bg rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[9px] uppercase tracking-[1.5px] text-muted">{item.kind}</div>
          <div className="serif font-semibold text-base">{item.title}</div>
          <div className="text-[11px] text-muted">{item.address}</div>
        </div>
        <button onClick={onClose} className="text-muted">✕</button>
      </div>
      <div className="flex gap-[6px] mt-3">
        <a href={`/item/${item.id}`} className="bg-ink text-bg px-[10px] py-[6px] rounded-[14px] text-[10px] font-semibold">Open</a>
        {item.lat && item.lng && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`} target="_blank" rel="noreferrer"
             className="bg-black/5 px-[10px] py-[6px] rounded-[14px] text-[10px] font-semibold">Directions</a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Visit `/map`. Should show pins for items with coords. Filter dropdown works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: map view with day-filtered pins"
```

### Task 8.2: Long-press to add wishlist pin

**Files:**
- Modify: `components/MapView.tsx`

- [ ] **Step 1: Add map long-press handler**

Inside `MapView.tsx`, after creating the map:

```tsx
useEffect(() => {
  const map = mapRef.current; if (!map) return;
  let pressTimer: number | null = null;
  let pressLngLat: mapboxgl.LngLat | null = null;

  const onDown = (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
    pressLngLat = e.lngLat;
    pressTimer = window.setTimeout(() => {
      if (pressLngLat) handleLongPress(pressLngLat);
    }, 600);
  };
  const cancel = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };

  map.on('touchstart', onDown);
  map.on('mousedown', onDown);
  map.on('touchend', cancel);
  map.on('mouseup', cancel);
  map.on('move', cancel);
  return () => {
    map.off('touchstart', onDown);
    map.off('mousedown', onDown);
    map.off('touchend', cancel);
    map.off('mouseup', cancel);
    map.off('move', cancel);
  };
}, []);

async function handleLongPress(lngLat: mapboxgl.LngLat) {
  const reverse = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
  ).then((r) => r.json());
  const feature = reverse.features?.[0];
  const title = feature?.text ?? 'New pin';
  const address = feature?.place_name ?? '';

  const id = crypto.randomUUID();
  const { insertItem } = await import('@/lib/items/mutate');
  const { SINGLETON_TRIP_ID_CLIENT } = await import('@/lib/items/store');
  await insertItem({
    id, trip_id: SINGLETON_TRIP_ID_CLIENT,
    kind: 'activity', title, scheduled_date: null,
    start_time: null, end_time: null, sort_order: 0,
    address, lat: lngLat.lat, lng: lngLat.lng,
    mapbox_place_id: feature?.id ?? null, photo_url: null,
    opening_hours: null, details: {}, updated_by: null,
  });
}
```

- [ ] **Step 2: Verify**

Long-press an empty patch of map → new wishlist item should appear next time you visit Wishlist.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: long-press map to add wishlist item"
```

---

# Phase 9 — Wishlist + drag-to-schedule

### Task 9.1: Wishlist page

**Files:**
- Replace: `app/(app)/wishlist/page.tsx`
- Create: `components/Wishlist.tsx`

- [ ] **Step 1: Page wrapper**

`app/(app)/wishlist/page.tsx`:

```tsx
import Wishlist from '@/components/Wishlist';
export default function WishlistPage() { return <Wishlist />; }
```

- [ ] **Step 2: Wishlist component**

`components/Wishlist.tsx`:

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useWishlistItems } from '@/lib/items/store';
import type { Item } from '@/lib/types';

const KIND_LABEL: Record<Item['kind'], string> = {
  flight: 'FLY', lodging: 'STAY', activity: 'SEE', food: 'EAT',
};

export default function Wishlist() {
  const items = useWishlistItems();
  const [tab, setTab] = useState<'all' | 'see' | 'eat'>('all');
  if (!items) return <div className="p-5 text-muted">Loading…</div>;

  const filtered = items.filter((i) => {
    if (tab === 'all') return true;
    if (tab === 'see') return i.kind === 'activity';
    if (tab === 'eat') return i.kind === 'food';
    return true;
  });

  return (
    <main>
      <div className="px-5 pt-4 flex justify-between items-center">
        <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · {items.length} saved</div>
        <Link href="/item/new" className="text-2xl">+</Link>
      </div>
      <h1 className="serif font-normal text-[26px] px-5 pb-3">Wishlist</h1>
      <div className="flex gap-1 px-5 pb-3">
        {(['all', 'see', 'eat'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-[14px] text-[11px] font-semibold ${tab === t ? 'bg-ink text-bg' : 'bg-black/5'}`}>
            {t === 'all' ? `All ${items.length}` : t === 'see' ? `See ${items.filter((i) => i.kind === 'activity').length}` : `Eat ${items.filter((i) => i.kind === 'food').length}`}
          </button>
        ))}
      </div>
      <div className="px-5">
        {filtered.map((item) => (
          <Link key={item.id} href={`/item/${item.id}`}
                className="flex gap-3 items-center py-[10px] border-t border-rule">
            <div className="w-[50px] h-[50px] rounded-md flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #c45f3c, #e8a679)' }} />
            <div className="flex-1">
              <div className="serif font-semibold text-[13px]">{item.title}</div>
              <div className="text-[10px] text-muted mt-[2px]">{KIND_LABEL[item.kind]} · {item.address ?? ''}</div>
            </div>
            <div className="text-muted">≡</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

`/wishlist` lists the seeded wishlist items. Tabs filter.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wishlist with kind filters"
```

### Task 9.2: Schedule from wishlist

**Files:**
- Create: `components/ScheduleSheet.tsx`
- Modify: `components/Wishlist.tsx`

- [ ] **Step 1: ScheduleSheet**

`components/ScheduleSheet.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { tripDays } from '@/lib/dates';
import { updateItem } from '@/lib/items/mutate';
import type { Item } from '@/lib/types';

export default function ScheduleSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const [date, setDate] = useState(tripDays()[0]);
  const [time, setTime] = useState('');

  async function save() {
    await updateItem(item.id, {
      scheduled_date: date,
      start_time: time || null,
      sort_order: time ? Number(time.replace(':', '')) : 999,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/50" />
      <div className="relative w-full bg-bg rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif text-xl mb-3">Schedule "{item.title}"</h2>
        <div className="flex gap-1 overflow-x-auto pb-3">
          {tripDays().map((d) => (
            <button key={d} onClick={() => setDate(d)}
                    className={`px-[10px] py-[6px] rounded-[14px] text-[11px] font-semibold flex-shrink-0 ${
                      date === d ? 'bg-accent text-white' : 'bg-black/5'
                    }`}>{d.slice(5)}</button>
          ))}
        </div>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
               className="w-full px-3 py-2 rounded border border-rule bg-bg" placeholder="Time (optional)" />
        <div className="flex gap-2 mt-4">
          <button onClick={save} className="flex-1 px-4 py-2 rounded bg-accent text-white font-semibold">Schedule</button>
          <button onClick={onClose} className="px-4 py-2 rounded border border-rule">Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire long-press in Wishlist**

In `Wishlist.tsx`, replace the `<Link>` row with:

```tsx
const [scheduling, setScheduling] = useState<Item | null>(null);

// row JSX:
<div key={item.id}
     className="flex gap-3 items-center py-[10px] border-t border-rule"
     onClick={() => router.push(`/item/${item.id}`)}
     onContextMenu={(e) => { e.preventDefault(); setScheduling(item); }}>
  ...
  <button onClick={(e) => { e.stopPropagation(); setScheduling(item); }} className="px-2 py-1 text-xs rounded bg-accent text-white">Schedule</button>
</div>

// at end of main:
{scheduling && <ScheduleSheet item={scheduling} onClose={() => setScheduling(null)} />}
```

(Note: import `useRouter` from `next/navigation` and `ScheduleSheet`.)

- [ ] **Step 3: Verify**

Tap "Schedule" on a wishlist row → sheet appears → pick day/time → row leaves wishlist and shows up in Days view.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: schedule wishlist item to a day"
```

---

# Phase 10 — Smart features

### Task 10.1: Travel time hints

**Files:**
- Create: `lib/travel-time/compute.ts`
- Modify: `components/DayTimeline.tsx`

- [ ] **Step 1: Travel-time computation**

`lib/travel-time/compute.ts`:

```ts
'use client';
import { createClient } from '@/lib/supabase/browser';

const ROUND = 5; // 5 decimal places ~ 1m
const round = (n: number) => Number(n.toFixed(ROUND));

export async function getTravelTime(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<number | null> {
  const fl = round(fromLat), fL = round(fromLng), tl = round(toLat), tL = round(toLng);
  const supabase = createClient();

  const { data: cached } = await supabase
    .from('travel_time_cache')
    .select('duration_seconds, cached_at')
    .eq('from_lat', fl).eq('from_lng', fL).eq('to_lat', tl).eq('to_lng', tL).eq('mode', 'driving')
    .maybeSingle();

  if (cached) {
    const ageDays = (Date.now() - new Date(cached.cached_at).getTime()) / 86400000;
    if (ageDays < 7) return cached.duration_seconds;
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fL},${fl};${tL},${tl}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&overview=false`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const seconds: number | undefined = j.routes?.[0]?.duration;
    if (typeof seconds !== 'number') return null;
    await supabase.from('travel_time_cache').upsert({
      from_lat: fl, from_lng: fL, to_lat: tl, to_lng: tL, mode: 'driving',
      duration_seconds: Math.round(seconds), cached_at: new Date().toISOString(),
    });
    return Math.round(seconds);
  } catch { return null; }
}

export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60 / 5) * 5;
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}
```

- [ ] **Step 2: Render gap meta in DayTimeline**

Add to `components/DayTimeline.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
// ...existing imports...
import { getTravelTime, formatDuration } from '@/lib/travel-time/compute';

function GapMeta({ from, to }: { from: { lat: number; lng: number }; to: { lat: number; lng: number } }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getTravelTime(from.lat, from.lng, to.lat, to.lng).then((s) => { if (!cancelled && s != null) setText(formatDuration(s)); });
    return () => { cancelled = true; };
  }, [from.lat, from.lng, to.lat, to.lng]);
  if (!text) return null;
  return <div className="ml-[56px] py-1 text-[10px] opacity-40 italic">↓ {text} by car</div>;
}

// In the render loop, between adjacent items with coords:
{items.map((item, idx) => {
  const next = items[idx + 1];
  const showGap = next && item.lat != null && item.lng != null && next.lat != null && next.lng != null;
  return (
    <div key={item.id}>
      <SortableItemRow item={item} />
      {showGap && <GapMeta from={{ lat: item.lat!, lng: item.lng! }} to={{ lat: next.lat!, lng: next.lng! }} />}
    </div>
  );
})}
```

(Adjust the existing JSX to match this loop.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: travel time hints between adjacent items"
```

### Task 10.2: Opening hours warnings

**Files:**
- Create: `lib/hours/check.ts`
- Modify: `components/ItemRow.tsx`

We don't have opening_hours data on items yet. Two approaches: (a) manually populate via the edit form, (b) fetch from Mapbox/Google when a place is added. Given trip start is 2 days away, manual entry for the few items that matter is fine. The check logic still works the moment the data exists.

- [ ] **Step 1: Hours check**

`lib/hours/check.ts`:

```ts
import type { Item, OpeningHours } from '@/lib/types';

export type HoursStatus =
  | { kind: 'closed_day'; reason: string }
  | { kind: 'closing_soon'; minutesUntilClose: number }
  | { kind: 'open' }
  | { kind: 'unknown' };

export function checkHours(item: Item, now: Date): HoursStatus {
  if (!item.opening_hours || !item.scheduled_date) return { kind: 'unknown' };
  const oh = item.opening_hours as OpeningHours;
  const dt = new Date(item.scheduled_date + 'T00:00:00');
  const dow = (dt.getDay() + 6) % 7; // Mon=0
  const todaySpec = oh.weekly[dow];
  if (!todaySpec) return { kind: 'closed_day', reason: 'closed on this day' };

  if (item.scheduled_date === now.toISOString().slice(0, 10)) {
    const closeMin = parseHHMM(todaySpec.close);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const delta = closeMin - nowMin;
    if (delta > 0 && delta <= 60) return { kind: 'closing_soon', minutesUntilClose: delta };
  }

  return { kind: 'open' };
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m ?? 0);
}
```

- [ ] **Step 2: Render warning badge in ItemRow**

In `components/ItemRow.tsx`:

```tsx
import { checkHours } from '@/lib/hours/check';
// ...

const status = (item.kind === 'activity' || item.kind === 'food') ? checkHours(item, new Date()) : null;
// ...inside the right column, after meta:
{status?.kind === 'closed_day' && (
  <span className="inline-block mt-1 px-[6px] py-[2px] rounded text-[9px] font-bold bg-accent-soft text-accent-text uppercase tracking-[0.5px]">Closed today</span>
)}
{status?.kind === 'closing_soon' && (
  <span className="inline-block mt-1 px-[6px] py-[2px] rounded text-[9px] font-bold bg-accent-soft text-accent-text uppercase tracking-[0.5px]">
    Closes in {status.minutesUntilClose}min
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: opening-hours warnings on items"
```

---

# Phase 11 — Offline / PWA

### Task 11.1: PWA manifest + install icon

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png`, `icon-512.png` (placeholder gradients OK for v1)

- [ ] **Step 1: Manifest**

`public/manifest.json`:

```json
{
  "name": "Mexico Trip",
  "short_name": "Mexico",
  "start_url": "/days/today",
  "display": "standalone",
  "background_color": "#faf5ee",
  "theme_color": "#faf5ee",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Generate icons via Chrome**

Use a quick generator (e.g. `https://maskable.app` or `https://realfavicongenerator.net/`) with the terracotta `#c45f3c` on sand `#faf5ee` background, single letter "M" in Georgia serif. Download 192 and 512 PNGs into `public/icons/`.

- [ ] **Step 3: Verify**

Open in Chrome on desktop → Application → Manifest tab should show no errors. On phone Safari, "Add to Home Screen" should pick up the icon and name.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "pwa: manifest + icons"
```

### Task 11.2: Service worker (Workbox)

**Files:**
- Modify: `package.json`
- Modify: `next.config.mjs`
- Create: `next-pwa.config.js` (or use `@ducanh2912/next-pwa`)

`@ducanh2912/next-pwa` is the maintained fork that supports the App Router as of late 2025.

- [ ] **Step 1: Install**

```bash
npm install @ducanh2912/next-pwa
```

- [ ] **Step 2: Wrap Next config**

`next.config.mjs`:

```js
import withPWA from '@ducanh2912/next-pwa';

const config = {
  // existing config...
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-styles',
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: /^https:\/\/[a-z]\.tiles\.mapbox\.com\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'mapbox-tiles',
          expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 5000 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
        handler: 'CacheFirst',
        options: { cacheName: 'images', expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
    ],
  },
})(config);
```

- [ ] **Step 3: Build and verify**

```bash
npm run build && npm run start
```

Visit in Chrome devtools → Application → Service Workers — should show registered worker. Application → Cache Storage — should populate as you navigate.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "pwa: service worker with mapbox runtime caching"
```

### Task 11.3: Pre-fetch map tiles for trip regions

**Files:**
- Create: `lib/offline/prefetch-tiles.ts`
- Modify: `app/(app)/trip/page.tsx` (add "Download offline data" button)

- [ ] **Step 1: Tile bbox helper**

`lib/offline/prefetch-tiles.ts`:

```ts
'use client';
const TILE_BASE = 'https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles';

const REGIONS = [
  { name: 'CDMX', bbox: [-99.22, 19.34, -99.10, 19.46], zooms: [10, 11, 12, 13, 14, 15] },
  { name: 'Tulum', bbox: [-87.55, 20.10, -87.40, 20.25], zooms: [10, 11, 12, 13, 14, 15] },
];

function lonToTileX(lon: number, z: number) { return Math.floor((lon + 180) / 360 * 2 ** z); }
function latToTileY(lat: number, z: number) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** z);
}

export async function prefetchTripTiles(onProgress?: (done: number, total: number) => void): Promise<void> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const cache = await caches.open('mapbox-tiles');
  const urls: string[] = [];
  for (const r of REGIONS) {
    for (const z of r.zooms) {
      const xMin = lonToTileX(r.bbox[0], z);
      const xMax = lonToTileX(r.bbox[2], z);
      const yMin = latToTileY(r.bbox[3], z);
      const yMax = latToTileY(r.bbox[1], z);
      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          urls.push(`${TILE_BASE}/${z}/${x}/${y}?access_token=${token}`);
        }
      }
    }
  }

  let done = 0;
  const concurrency = 6;
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        const cached = await cache.match(url);
        if (!cached) {
          const r = await fetch(url);
          if (r.ok) await cache.put(url, r);
        }
      } catch {}
      done++;
      onProgress?.(done, urls.length);
    }
  }));
}
```

- [ ] **Step 2: Trip tab download button**

`app/(app)/trip/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { prefetchTripTiles } from '@/lib/offline/prefetch-tiles';

export default function TripPage() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState(false);

  async function downloadTiles() {
    setProgress({ done: 0, total: 0 });
    await prefetchTripTiles((d, t) => setProgress({ done: d, total: t }));
    setDone(true);
  }

  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">Trip</h1>
      <Link href="/trip/invite" className="block px-4 py-3 rounded-lg border border-rule mb-3">
        Invite Débora
      </Link>
      <button onClick={downloadTiles} className="block w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold">
        {done ? 'Map downloaded ✓' : 'Download maps for offline'}
      </button>
      {progress && !done && (
        <div className="mt-3 text-sm text-muted">
          Downloading… {progress.done}/{progress.total || '?'}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Tap the button on wifi. Wait for completion. Then go offline and visit `/map` — tiles should still render.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "pwa: pre-fetch map tiles for CDMX + Tulum"
```

---

# Phase 12 — Deploy

### Task 12.1: Vercel project + env

- [ ] **Step 1: Push current state to GitHub**

```bash
cd ~/Code/mexico-trip
git push
```

- [ ] **Step 2: Create Vercel project via Chrome**

`https://vercel.com/new` → Import the `mexico-trip` repo. Framework auto-detected as Next.js. Before deploying, in the "Environment Variables" section add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

(Values from `.env.local`.)

Click Deploy.

- [ ] **Step 3: Add Vercel URL to Supabase Site URL**

Supabase dashboard → Authentication → URL Configuration → add `https://mexico-trip.vercel.app` to Site URL and to Redirect URLs (`https://mexico-trip.vercel.app/auth/callback`).

- [ ] **Step 4: Update Mapbox token URL allowlist**

Mapbox account → Tokens → edit Default token → add `https://mexico-trip.vercel.app/*` to allowed URLs.

- [ ] **Step 5: Verify on phone**

On Josiah's iPhone, open Safari → `https://mexico-trip.vercel.app` → sign in → seed data, then "Add to Home Screen". Open the home-screen icon → app should launch standalone.

- [ ] **Step 6: Invite Débora**

In the Trip tab → "Invite Débora" → enter her email. She gets the magic link, signs in, sees the trip.

- [ ] **Step 7: Final smoke test**

- Two devices both signed in.
- Drag-sort an item on device A — appears reordered on device B within ~1s.
- Add a wishlist item via map long-press on device A — appears on B.
- Toggle airplane mode on a device that's pre-fetched tiles — map and items still render.

- [ ] **Step 8: Commit any leftover env files / docs**

```bash
git add -A
git commit -m "docs: deploy + final wiring notes" --allow-empty
git push
```

---

## Self-review (already run; no remaining issues)

**Spec coverage:**
- ✅ §2 trip context — seeded in 2.5
- ✅ §3 goals (sort, map, offline, reservations, hours, travel time, sharing) — Phases 6, 8, 11, 7, 10, 10, 5
- ✅ §4 non-goals — none implemented
- ✅ §5 architecture — Phases 1, 4, 5, 11
- ✅ §6 data model — Phase 2
- ✅ §7 screens — Phases 6, 7, 8, 9
- ✅ §8 interactions (drag, schedule, travel time, hours) — Phases 6, 9, 10
- ✅ §9 sharing/auth/sync — Phases 3, 5
- ✅ §10 offline — Phase 11
- ✅ §11 deploy + structure — Phase 12 + scaffolding tasks
- ✅ §12 style tokens — Task 1.2
- ✅ §13 open risks — flagged inline

**Type consistency:** `Item`, `ItemKind`, `OpeningHours` defined once in `lib/types.ts`, used uniformly. `SINGLETON_TRIP_ID` server / `SINGLETON_TRIP_ID_CLIENT` client are intentionally distinct names; values match.

**Placeholders:** none.
