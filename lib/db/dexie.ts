import Dexie, { type Table } from 'dexie';
import type { Item } from '@/lib/types';

export type WriteQueueEntry = {
  id?: number;
  op: 'insert' | 'update' | 'delete';
  table: 'item' | 'attachment';
  payload: Record<string, unknown>;
  attempts: number;
  enqueued_at: number;
};

class TripDB extends Dexie {
  item!: Table<Item, string>;
  write_queue!: Table<WriteQueueEntry, number>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('mexico-trip');
    this.version(1).stores({
      item: 'id, trip_id, scheduled_date, kind, [trip_id+scheduled_date]',
      write_queue: '++id, enqueued_at',
      meta: 'key',
    });
  }
}

export const db = new TripDB();
