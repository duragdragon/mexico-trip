'use client';
import Link from 'next/link';
import type { Item } from '@/lib/types';

const ICON: Record<Item['kind'], { glyph: string; bg: string }> = {
  flight: { glyph: '✈', bg: 'bg-icon-fly' },
  lodging: { glyph: '⌂', bg: 'bg-icon-stay' },
  activity: { glyph: '◯', bg: 'bg-icon-see' },
  food: { glyph: '▼', bg: 'bg-icon-eat' },
};

export default function ItemRow({ item }: { item: Item }) {
  const i = ICON[item.kind];
  const time = item.start_time?.slice(0, 5) ?? '';
  return (
    <Link href={`/item/${item.id}`} className="flex gap-[14px] py-[14px] border-t border-rule first:border-t-0">
      <div className="flex flex-col items-center w-[42px] flex-shrink-0">
        <div className="text-[11px] font-bold tracking-[-0.3px]">{time}</div>
        <div className={`w-7 h-7 rounded-full mt-[6px] flex items-center justify-center text-white text-xs ${i.bg}`}>{i.glyph}</div>
      </div>
      <div className="flex-1">
        <div className="serif font-semibold text-[15px] leading-tight">{item.title}</div>
        <div className="text-[11px] text-muted mt-[3px]">{itemMeta(item)}</div>
      </div>
    </Link>
  );
}

function itemMeta(item: Item): string {
  if (item.kind === 'flight') {
    const d = item.details as Record<string, string | undefined>;
    return `${d.number ?? ''} · ${d.from_airport ?? ''} → ${d.to_airport ?? ''}${d.confirmation ? ` · conf ${d.confirmation}` : ''}`;
  }
  if (item.kind === 'lodging') return `${item.address ?? ''}`;
  if (item.kind === 'food') {
    const d = item.details as Record<string, string | undefined>;
    return `${d.cuisine ?? 'Restaurant'}${d.meal_type ? ` · ${d.meal_type}` : ''}`;
  }
  const d = item.details as Record<string, string | undefined>;
  return d.category ?? 'Activity';
}
