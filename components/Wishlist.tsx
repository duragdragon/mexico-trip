'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWishlistItems } from '@/lib/items/store';
import ScheduleSheet from '@/components/ScheduleSheet';
import type { Item } from '@/lib/types';

const KIND_LABEL: Record<Item['kind'], string> = {
  flight: 'FLY', lodging: 'STAY', activity: 'SEE', food: 'EAT',
};

export default function Wishlist() {
  const router = useRouter();
  const items = useWishlistItems();
  const [tab, setTab] = useState<'all' | 'see' | 'eat'>('all');
  const [scheduling, setScheduling] = useState<Item | null>(null);

  if (!items) return <div className="p-5 text-muted">Loading…</div>;

  const filtered = items.filter((i) => {
    if (tab === 'all') return true;
    if (tab === 'see') return i.kind === 'activity';
    if (tab === 'eat') return i.kind === 'food';
    return true;
  });

  return (
    <main>
      <div className="px-5 pt-4 flex justify-between items-center">
        <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · {items.length} saved</div>
        <Link href="/item/new" className="text-2xl leading-none">+</Link>
      </div>
      <h1 className="serif font-normal text-[26px] px-5 pb-3">Wishlist</h1>
      <div className="flex gap-1 px-5 pb-3">
        {(['all', 'see', 'eat'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-[14px] text-[11px] font-semibold ${tab === t ? 'bg-ink text-bg' : 'bg-black/5'}`}>
            {t === 'all'
              ? `All ${items.length}`
              : t === 'see'
              ? `See ${items.filter((i) => i.kind === 'activity').length}`
              : `Eat ${items.filter((i) => i.kind === 'food').length}`}
          </button>
        ))}
      </div>
      <div className="px-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 items-center py-[10px] border-t border-rule cursor-pointer"
            onClick={() => router.push(`/item/${item.id}`)}
            onContextMenu={(e) => { e.preventDefault(); setScheduling(item); }}
          >
            <div
              className="w-[50px] h-[50px] rounded-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #c45f3c, #e8a679)' }}
            />
            <div className="flex-1 min-w-0">
              <div className="serif font-semibold text-[13px] truncate">{item.title}</div>
              <div className="text-[10px] text-muted mt-[2px] truncate">{KIND_LABEL[item.kind]} · {item.address ?? ''}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setScheduling(item); }}
              className="px-2 py-1 text-xs rounded bg-accent text-white flex-shrink-0"
            >
              Schedule
            </button>
          </div>
        ))}
      </div>
      {scheduling && <ScheduleSheet item={scheduling} onClose={() => setScheduling(null)} />}
    </main>
  );
}
