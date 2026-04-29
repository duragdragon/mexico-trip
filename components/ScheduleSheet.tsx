'use client';
import { useState } from 'react';
import { tripDays, shortDay } from '@/lib/dates';
import { updateItem } from '@/lib/items/mutate';
import type { Item } from '@/lib/types';

export default function ScheduleSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const [date, setDate] = useState(tripDays()[0]);
  const [time, setTime] = useState('');

  async function save() {
    await updateItem(item.id, {
      scheduled_date: date,
      start_time: time || null,
      sort_order: time ? Number(time.replace(':', '')) : 999,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/50" />
      <div className="relative w-full bg-bg rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="serif text-xl mb-3">Schedule &ldquo;{item.title}&rdquo;</h2>
        <div className="flex gap-1 overflow-x-auto pb-3 no-scrollbar">
          {tripDays().map((d) => (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`px-[10px] py-[6px] rounded-[14px] text-[11px] font-semibold flex-shrink-0 ${
                date === d ? 'bg-accent text-white' : 'bg-black/5'
              }`}
            >
              {shortDay(d)}
            </button>
          ))}
        </div>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-3 py-2 rounded border border-rule bg-bg"
          placeholder="Time (optional)"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={save} className="flex-1 px-4 py-2 rounded bg-accent text-white font-semibold">
            Schedule
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded border border-rule">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
