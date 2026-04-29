# Mexico Trip App — Design Spec

**Date:** 2026-04-29
**Author:** Josiah Campbell (with Claude)
**Trip:** 1–10 May 2026, Mexico City + Tulum, Josiah + Débora Marques Camelo

## 1. Why this exists

Wanderlog covers the data model well (flights, lodging, places, restaurants, reservations) but the UX is bloated with Pro upsells, a budget tab, a journal, recommended-places suggestions, and visual noise. We want a bespoke, two-person trip planner for one specific 10-day trip — no second-trip support, no public sharing, no monetisation hooks. Just the parts we actually use.

The two features Wanderlog does poorly: **sortable itinerary** (drag items around within a day) and **a map view that respects the day you're looking at**. These are the must-haves.

## 2. Trip context (seed data)

Pre-loaded on day one so the app isn't empty:

**International flights:**
- BA 243 — Fri 1 May, LHR 15:10 → MEX 19:45
- BA 242 — Sun 10 May, MEX 22:00 → LHR 15:30 (+1)

**Domestic flights:**
- AM 592 — Mon 4 May, MEX 08:40 → TQO 11:40 (conf WVPGOR)
- VB 7447 — Wed 6 May, TQO 16:30 → MEX 17:45 (conf SCH4TP)

**Lodging:**
- Tonalá 127, Roma Norte, CDMX — Fri 1 → Mon 4 May (3 nights, conf 5264985189)
- Tago Tulum by G Hotels, Carr. Tulum-Boca Paila km 6.5 — Mon 4 → Wed 6 May (2 nights, conf 5502450241)
- Tonalá 127, Roma Norte, CDMX — Wed 6 → Sat 9 May (3 nights, conf 6053617120)

**Note:** Sat 9 May → Sun 10 May 22:00 flight is currently a gap in lodging. The app should surface this gap visibly so it's easy to fill.

**Places already saved:**
- See: Frida Kahlo Museum, Soho House Mexico City, Grutas Tolantongo
- Eat: Salón Palomilla, Panadería Rosetta

## 3. Goals

- **Two-person realtime collaboration.** Both phones see the same data. Edits sync within ~1s.
- **Sortable itinerary.** Drag items within a day to reorder. Drag from Wishlist → a day to schedule. Drag back to null the date.
- **Map view tied to the active day.** Pins numbered in itinerary order. Day-toggle filters pins.
- **Full offline mode.** App shell + trip data + map tiles for our regions + reservation PDFs all available in airplane mode (cenote excursions, in-flight, spotty Tulum coast).
- **Reservation details first-class.** Confirmation numbers, check-in/out times, attached PDFs.
- **Opening-hours awareness.** Warn when a place is closed on the day it's scheduled (e.g. Frida Kahlo closed Mon).
- **Travel time hints.** Show estimated travel time between adjacent items in the itinerary.
- **Editorial Warm aesthetic.** Serif headers (Georgia or similar), sand background (#faf5ee), terracotta accent (#c45f3c), photo-forward.

## 4. Non-goals

Explicitly out of scope:

- Free-text notes per item (cut in scoping)
- Packing / pre-trip checklist (cut in scoping)
- Budget tracking, currency conversion
- Journal / diary entries
- Public view-only share links
- Push notifications
- Weather, translation, or any utility that isn't trip-data
- Multi-trip support — this is a one-trip app
- Recommended places / discovery
- Pro tier, paywalls, telemetry

## 5. Architecture

```
phone (Safari, "Add to Home Screen")
  Next.js PWA (App Router)
  ├── Service worker (Workbox) — app shell + map tile cache
  ├── IndexedDB (Dexie) — local mirror of trip data
  └── Mapbox GL JS — interactive map

         │ HTTPS                              │ Mapbox APIs
         ▼                                    ▼
  Supabase                              Mapbox
  • Postgres (trip data)                • Tiles (custom Editorial style)
  • Auth (magic link)                   • Geocoding API
  • Realtime channel per trip_id        • Directions API (travel time)
  • Row-level security                  • Static thumbnails (place photos)
  • Storage bucket (PDFs, photos)

  Hosted on Vercel: mexico-trip.vercel.app (custom domain optional)
```

**Data flow rule:** every read hits IndexedDB first (instant, offline-safe), then Supabase in the background. Writes go to IndexedDB instantly, queue locally, and replay to Supabase when online. UI never blocks on network.

## 6. Data model

Six tables. Italics = nullable.

### `trip`
- `id` uuid pk
- `name` text — "Mexico May 2026"
- `start_date`, `end_date` date
- `home_timezone` text — "Europe/London"
- `destinations` jsonb — `[{name, tz, start_date, end_date}]`

### `trip_member`
- `trip_id` fk
- `user_id` fk to auth.users
- `role` text — `owner` | `editor`
- pk: `(trip_id, user_id)`

### `item` — the one big table
Discriminator pattern. All flights, lodging, activities, food live here.

- `id` uuid pk
- `trip_id` fk
- `kind` text — `flight` | `lodging` | `activity` | `food`
- `title` text
- *`scheduled_date`* date — null = on Wishlist
- *`start_time`*, *`end_time`* time
- `sort_order` int — manual order within a day
- *`address`* text
- *`lat`*, *`lng`* float8
- *`mapbox_place_id`* text
- *`photo_url`* text
- *`opening_hours`* jsonb — Mapbox/OSM format
- `details` jsonb — kind-specific blob (see below)
- `created_at`, `updated_at` timestamptz
- `updated_by` uuid (for last-write-wins resolution)

`details` shapes per kind:
- **flight:** `{airline, number, from_airport, to_airport, departure_dt, arrival_dt, confirmation, price}`
- **lodging:** `{check_in_date, check_out_date, confirmation, price, room_name}`
- **activity:** `{category, booked, price, link}`
- **food:** `{meal_type, reservation_at, link, cuisine}`

### `attachment`
- `id` uuid pk
- `item_id` fk
- `kind` text — `pdf` | `image`
- `storage_path` text
- `filename` text
- `uploaded_at` timestamptz

PDFs stored in a Supabase Storage bucket (`trip-attachments`), gated by RLS.

### `travel_time_cache`
Memoizes Mapbox Directions results so we don't re-hit the API.
- `from_lat`, `from_lng`, `to_lat`, `to_lng` numeric(8,5) — rounded to ~1m precision so trivially-different coords share a cache entry
- `mode` text — `driving` (only mode for now)
- `duration_seconds` int
- `cached_at` timestamptz
- pk: composite of the four coords + mode

### IndexedDB (local-only, not in Postgres)
- `tile_cache_manifest` — tracks bbox + zoom levels we've pre-fetched per destination
- `write_queue` — pending mutations to replay when back online

### RLS policies
- A user can read/write a row in `trip`, `item`, `attachment`, `travel_time_cache` only if they have a row in `trip_member` for that trip_id.
- `trip_member` rows are insertable only by the trip's `owner`.

## 7. Screens

Four primary tabs (bottom nav):

### Days
- Top: horizontal day-strip (F1, S2, S3, M4 …) — active day highlighted terracotta.
- Below: vertical timeline of items for that day. Each item:
  - Left: time + circular icon coloured by kind (flight/stay/eat/see).
  - Right: title (serif), kind-specific meta line.
- Between adjacent items: italic "↓ ~12 min by car" gap-meta.
- "Closes in 1h" warning badge when a scheduled activity has < 1 hr until close.
- Avatars (you + Débora) top-right; the other person's avatar gets a green dot when they're actively editing.
- Long-press an item → drag handle appears, can reorder (updates `sort_order`).
- "+" button → add item (defaults to scheduled on the current day).

### Map
- Mapbox GL JS, custom Editorial Warm style (sand land, dark teal water, terracotta highlights).
- Top-centre dropdown: Today / Whole trip / Day picker / Wishlist-only.
- Pins numbered to match the day's itinerary order. Faded for prev/next day.
- Whole-trip mode: pins coloured by day along a warm-to-cool gradient.
- Tap pin → bottom card with title, meta, "Open in itinerary" + "Directions".
- Long-press anywhere → "Add to Wishlist" with reverse-geocoded address.
- Dotted route line connects the day's pins in order.

### Wishlist
- Title "Wishlist", count chip ("14 saved"), "+" to add.
- Segmented control: All / See / Eat.
- List rows: thumbnail, title (serif), kind + neighbourhood + closure flag if relevant.
- Drag handle on each row — long-press to grab, drop on a day in the day-strip-overlay to schedule.
- Pull-to-search.

### Item detail
- Hero photo (autodetected from Mapbox place; user can override with upload).
- Back button overlaid top-left; pill bottom-left with "EAT · Mon 4 May".
- Title (serif), location + price-tier chips.
- Structured fields, no free-text:
  - **When** — date + time range
  - **Reservation** — service + party size + confirmation # (kind-dependent)
  - **Hours today** — open/closed status from opening_hours
  - **From previous stop** — travel time string
  - **Attachments** — list of PDFs/images
- Edit pencil top-right opens an edit sheet keyed by `kind`.

## 8. Key interactions

### Drag-sort within a day
- Long-press → item lifts (haptic + scale).
- Drag → others reflow.
- Drop → write `sort_order` for the moved item; recompute affected siblings.
- Times don't auto-shift unless you explicitly edit them. Sort is independent of time.

### Schedule from Wishlist
- Long-press in Wishlist → "Schedule" sheet appears.
- Pick day from day-strip, optional time.
- On confirm: sets `scheduled_date`, optional `start_time`, sort_order = (max for that day) + 1.

### Move back to Wishlist
- In Days, swipe left on an item → "Unschedule" action → sets `scheduled_date = null`.

### Travel time computation
- On render, for each adjacent (i, i+1) pair where both have lat/lng:
  - Look up `travel_time_cache` by coord pair.
  - If miss, fire Mapbox Directions API request, write result to cache.
  - Display rounded to nearest 5 min.
- Stale-while-revalidate: serve cached value, refresh in background if > 7 days old.

### Opening-hours warning
- On Days view, for any activity/food item with `opening_hours`:
  - If item's `scheduled_date` falls on a closed day → red "CLOSED" badge.
  - If currently open and closes within 60 min of now (when `scheduled_date == today`) → amber "closes in Xh" badge.

## 9. Sharing, auth & sync

- **Auth:** Supabase magic link, no passwords. Josiah signs up first; trip is created under his account.
- **Invite flow:** Trip tab → "Invite Débora" → enter `debora.marquescamelo@…` (or whichever) → server emails a one-tap link that signs her in and inserts a `trip_member` row with role `editor`.
- **No public access:** unauthenticated users hitting the URL get the sign-in screen.
- **Realtime sync:** Postgres trigger on `item` table broadcasts diffs on a channel `trip:{trip_id}`. Both clients subscribe; updates patch IndexedDB and re-render affected views.
- **Conflict handling:** last-write-wins per row, on `item.updated_at`. Realtime delivers within ~1s, so the simultaneous-edit window is small enough to not need per-field CRDT logic. Acceptable for two trusted collaborators; can revisit if it ever bites.
- **Presence:** `trip:{trip_id}:presence` channel tracks who's online. Avatar gets a green dot when the other user is connected and active in the last 30s.

## 10. Offline strategy

- **App shell:** Workbox precache for HTML/CSS/JS/fonts/icon assets. App opens in airplane mode.
- **Trip data:** Dexie-backed IndexedDB mirror of `trip`, `item`, `attachment` rows for the current trip. Hydrated on first auth, kept in sync via realtime + delta polling.
- **Writes offline:** every mutation writes to IndexedDB immediately + appends to `write_queue`. On reconnect, queue replays in order against Supabase. UI is optimistic.
- **Map tiles:** on first opening of a destination, pre-fetch tiles for that bbox at zoom 10–16 using Mapbox's offline tile fetching (within ToS — request limits handled). Estimated <50 MB total for CDMX (Roma + Coyoacán + Centro) and Tulum coast. Stored in Cache Storage with 30-day TTL.
- **Photos & PDFs:** lazy-cached on first view. Once an item has been opened, its hero photo and attached PDFs persist in Cache Storage indefinitely (until manual clear).
- **Attachment uploads offline:** PDFs picked while offline are stored as Blobs in IndexedDB, uploaded when reconnected.

## 11. Deploy & project structure

```
~/Code/mexico-trip/
├── apps/web/                          ← Next.js app
│   ├── app/                           ← App Router
│   │   ├── (auth)/sign-in/
│   │   ├── trip/[id]/days/[date]/
│   │   ├── trip/[id]/map/
│   │   ├── trip/[id]/wishlist/
│   │   └── trip/[id]/item/[id]/
│   ├── components/
│   ├── lib/
│   │   ├── supabase/                  ← server + browser clients, RLS helpers
│   │   ├── db/                        ← Dexie wrapper
│   │   ├── sync/                      ← realtime + write queue
│   │   └── mapbox/                    ← directions/geocoding/tile cache
│   ├── public/
│   │   ├── manifest.json              ← PWA install
│   │   └── icons/                     ← Editorial Warm app icons
│   └── workers/service-worker.ts
├── supabase/
│   ├── migrations/                    ← SQL: 6 tables + RLS + triggers
│   └── seed.sql                       ← Pre-loaded flights/lodging/places
├── docs/superpowers/specs/
│   └── 2026-04-29-mexico-trip-app-design.md
└── README.md
```

**External services:**
- **GitHub:** `josiah/mexico-trip` (private repo)
- **Vercel:** `mexico-trip.vercel.app` (custom domain optional)
- **Supabase project:** `mexico-trip-may-2026` (free tier)
- **Mapbox account:** generated tokens stored in Vercel env vars

**Environments:** single environment (production). No staging needed for a one-trip app.

**Env vars (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, for invite flow)
- `NEXT_PUBLIC_MAPBOX_TOKEN`

## 12. Editorial Warm style tokens

```
--bg:           #faf5ee  (sand)
--text:         #2b1c14  (deep walnut)
--muted:        rgba(43,28,20,0.55)
--rule:         #e6dcc9
--accent:       #c45f3c  (terracotta)
--accent-warn:  #f4d4d0 / #8a3a2a
--icon-eat:     #8b4513
--icon-see:     #b8860b
--icon-stay:    #4a6b52  (deep teal-green)
--icon-fly:     #c45f3c

font-serif:     Georgia, "Times New Roman", serif    (for titles, big numerals)
font-sans:      -apple-system, system-ui, sans-serif (for body, meta, UI chrome)
```

## 13. Open questions / risks

- **Lodging gap Sat 9 May → Sun 10 May.** Real-world problem, not a design problem — surface it visibly in the Trip overview.
- **Mapbox offline tile fetching ToS.** Need to confirm token plan covers offline tile caching; may need to use the Maps SDK approach within free-tier limits or fall back to MapTiler for offline.
- **Magic-link delivery to Débora.** Supabase free tier uses their email infra; deliverability to her email provider should be tested with her real address before the trip.
- **Time zones.** Trip spans Europe/London (home), America/Mexico_City (CDMX + Tulum). Times stored as UTC, displayed in destination tz. The current-day calculation uses destination tz so "today" is correct on the ground.
