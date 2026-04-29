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
