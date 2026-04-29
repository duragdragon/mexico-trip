-- supabase/migrations/20260429000003_storage.sql
-- Create the private trip-attachments bucket and its RLS policies

insert into storage.buckets (id, name, public)
values ('trip-attachments', 'trip-attachments', false)
on conflict do nothing;

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
