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
