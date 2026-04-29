'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { insertItem } from '@/lib/items/mutate';
import { SINGLETON_TRIP_ID_CLIENT } from '@/lib/items/store';
import { tripDays } from '@/lib/dates';

function NewItemForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialDate = sp.get('date') ?? '';
  const [kind, setKind] = useState<'activity' | 'food' | 'flight' | 'lodging'>('activity');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);

  async function create() {
    const id = crypto.randomUUID();
    await insertItem({
      id, trip_id: SINGLETON_TRIP_ID_CLIENT, kind, title,
      scheduled_date: date || null, start_time: null, end_time: null, sort_order: 0,
      address: null, lat: null, lng: null, mapbox_place_id: null,
      photo_url: null, opening_hours: null, details: {}, updated_by: null,
    });
    router.push(`/item/${id}/edit`);
  }

  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">New item</h1>
      <div className="space-y-3 max-w-md">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}
                className="w-full px-3 py-2 rounded border border-rule bg-bg">
          <option value="activity">Activity</option>
          <option value="food">Food / Drink</option>
          <option value="flight">Flight</option>
          <option value="lodging">Lodging</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
               className="w-full px-3 py-2 rounded border border-rule bg-bg" />
        <select value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-rule bg-bg">
          <option value="">— Wishlist —</option>
          {tripDays().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={create} className="px-4 py-2 rounded bg-accent text-white font-semibold">Create</button>
      </div>
    </main>
  );
}

export default function NewItemPage() {
  return (
    <Suspense>
      <NewItemForm />
    </Suspense>
  );
}
