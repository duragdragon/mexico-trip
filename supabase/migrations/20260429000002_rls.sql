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
