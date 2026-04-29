-- Enable Supabase Realtime replication for the item table
-- Required for postgres_changes subscriptions in lib/items/realtime.ts
alter publication supabase_realtime add table public.item;
