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
      {
        event: '*',
        schema: 'public',
        table: 'item',
        filter: `trip_id=eq.${SINGLETON_TRIP_ID_CLIENT}`,
      },
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

  return () => {
    void supabase.removeChannel(channel);
  };
}
