import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db/dexie';
import { updateItem } from '@/lib/items/mutate';
import type { Item } from '@/lib/types';

// vi.mock is hoisted to module scope by vitest — must be at top level
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    from: () => ({
      insert: async () => ({}),
      update: () => ({ eq: async () => ({}) }),
      delete: () => ({ eq: async () => ({}) }),
    }),
  }),
}));

const sample: Item = {
  id: 'a', trip_id: '00000000-0000-0000-0000-000000000001',
  kind: 'activity', title: 'X', scheduled_date: '2026-05-04',
  start_time: null, end_time: null, sort_order: 0,
  address: null, lat: null, lng: null, mapbox_place_id: null,
  photo_url: null, opening_hours: null, details: {},
  created_at: '2026-04-29T00:00:00Z', updated_at: '2026-04-29T00:00:00Z',
  updated_by: null,
};

describe('updateItem', () => {
  beforeEach(async () => {
    await db.item.clear();
    await db.write_queue.clear();
    await db.item.put(sample);
  });

  it('writes optimistically to dexie', async () => {
    await updateItem('a', { title: 'Y' });
    const after = await db.item.get('a');
    expect(after?.title).toBe('Y');
  });

  it('enqueues a write_queue entry', async () => {
    await updateItem('a', { sort_order: 5 });
    const entries = await db.write_queue.toArray();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].op).toBe('update');
  });
});
