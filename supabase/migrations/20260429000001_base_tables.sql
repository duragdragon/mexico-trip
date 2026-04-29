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
