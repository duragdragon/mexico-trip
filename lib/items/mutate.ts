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
    op: 'insert', table: 'item', payload: full as unknown as Record<string, unknown>,
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
