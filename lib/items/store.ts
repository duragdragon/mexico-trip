'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import type { Item } from '@/lib/types';

// Single-trip app: this is the same UUID as SINGLETON_TRIP_ID on the server
export const SINGLETON_TRIP_ID_CLIENT = '00000000-0000-0000-0000-000000000001';

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
  // Dexie can't index null values directly — use runtime filter instead
  return useLiveQuery(async () => {
    const all = await db.item.where('trip_id').equals(SINGLETON_TRIP_ID_CLIENT).toArray();
    return all.filter((i) => i.scheduled_date === null).sort((a, b) => a.title.localeCompare(b.title));
  }, []);
}

export function useAllItems(): Item[] | undefined {
  return useLiveQuery(() => db.item.toArray(), []);
}
