'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateItem } from '@/lib/items/mutate';
import { tripDays } from '@/lib/dates';
import type { Item } from '@/lib/types';

export default function ItemEditForm({ item }: { item: Item }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [date, setDate] = useState(item.scheduled_date ?? '');
  const [start, setStart] = useState(item.start_time ?? '');
  const [end, setEnd] = useState(item.end_time ?? '');
  const [address, setAddress] = useState(item.address ?? '');
  const [details, setDetails] = useState(JSON.stringify(item.details, null, 2));

  async function save() {
    let parsedDetails: Record<string, unknown> = {};
    try { parsedDetails = JSON.parse(details); } catch { alert('Details must be valid JSON'); return; }
    await updateItem(item.id, {
      title,
      scheduled_date: date || null,
      start_time: start || null,
      end_time: end || null,
      address: address || null,
      details: parsedDetails as Item['details'],
    });
    router.push(`/item/${item.id}`);
  }

  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">Edit</h1>
      <div className="space-y-3 max-w-md">
        <Labelled label="Title">
          <input className="w-full px-3 py-2 rounded border border-rule bg-bg" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Labelled>
        <Labelled label="Date">
          <select className="w-full px-3 py-2 rounded border border-rule bg-bg" value={date} onChange={(e) => setDate(e.target.value)}>
            <option value="">— Wishlist —</option>
            {tripDays().map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Labelled>
        <div className="flex gap-2">
          <Labelled label="Start"><input type="time" className="w-full px-3 py-2 rounded border border-rule bg-bg" value={start} onChange={(e) => setStart(e.target.value)} /></Labelled>
          <Labelled label="End"><input type="time" className="w-full px-3 py-2 rounded border border-rule bg-bg" value={end} onChange={(e) => setEnd(e.target.value)} /></Labelled>
        </div>
        <Labelled label="Address">
          <input className="w-full px-3 py-2 rounded border border-rule bg-bg" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Labelled>
        <Labelled label={`Details (JSON, ${item.kind})`}>
          <textarea className="w-full px-3 py-2 rounded border border-rule bg-bg font-mono text-xs h-40" value={details} onChange={(e) => setDetails(e.target.value)} />
        </Labelled>

        <div className="flex gap-2 pt-2">
          <button onClick={save} className="px-4 py-2 rounded bg-accent text-white font-semibold">Save</button>
          <button onClick={() => router.back()} className="px-4 py-2 rounded border border-rule">Cancel</button>
        </div>
      </div>
    </main>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-[1.5px] text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}
