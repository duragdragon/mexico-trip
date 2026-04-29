'use client';
import Link from 'next/link';
import type { Item } from '@/lib/types';
import { longDay } from '@/lib/dates';
import ItemHero from './ItemHero';
import Attachments from './Attachments';

export default function ItemDetail({ item }: { item: Item }) {
  return (
    <main>
      <ItemHero item={item} />
      <div className="px-5 -mt-2">
        <h1 className="serif text-[24px] font-semibold pb-2">{item.title}</h1>
        <div className="flex gap-[10px] flex-wrap mb-[14px] text-[11px] text-muted">
          {item.address && <div>⌖ {item.address}</div>}
        </div>

        <Field label="When" value={whenString(item)} />
        {item.kind === 'flight' && <FlightFields item={item} />}
        {item.kind === 'lodging' && <LodgingFields item={item} />}
        {item.kind === 'food' && <FoodFields item={item} />}
        {item.kind === 'activity' && <ActivityFields item={item} />}

        <Attachments itemId={item.id} />

        <div className="mt-6">
          <Link href={`/item/${item.id}/edit`} className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
            Edit
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="border-t border-rule py-[10px]">
      <div className="text-[9px] tracking-[1.5px] uppercase text-muted mb-[3px]">{label}</div>
      <div className="text-[13px] font-medium">{value}</div>
    </div>
  );
}

function whenString(item: Item): string | null {
  if (!item.scheduled_date) return 'Wishlist (unscheduled)';
  const time = item.start_time ? ` · ${item.start_time.slice(0,5)}${item.end_time ? `—${item.end_time.slice(0,5)}` : ''}` : '';
  return `${longDay(item.scheduled_date)}${time}`;
}

function FlightFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | number | undefined>;
  return (
    <>
      <Field label="Flight" value={`${d.airline ?? ''} ${d.number ?? ''}`} />
      <Field label="Route" value={`${d.from_airport ?? ''} → ${d.to_airport ?? ''}`} />
      <Field label="Confirmation" value={String(d.confirmation ?? '')} />
      {d.price && <Field label="Price" value={`£${d.price}`} />}
    </>
  );
}
function LodgingFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | number | undefined>;
  return (
    <>
      <Field label="Check-in / out" value={`${d.check_in_date ?? ''} → ${d.check_out_date ?? ''}`} />
      <Field label="Confirmation" value={String(d.confirmation ?? '')} />
      {d.price && <Field label="Price" value={`$${d.price}`} />}
      {d.room_name && <Field label="Room" value={String(d.room_name)} />}
    </>
  );
}
function FoodFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | undefined>;
  return (
    <>
      <Field label="Cuisine" value={d.cuisine ?? null} />
      <Field label="Meal" value={d.meal_type ?? null} />
      {d.link && <Field label="Link" value={d.link} />}
    </>
  );
}
function ActivityFields({ item }: { item: Item }) {
  const d = item.details as Record<string, string | boolean | undefined>;
  return (
    <>
      <Field label="Type" value={d.category as string ?? null} />
      <Field label="Booked" value={d.booked ? 'Yes' : 'No'} />
    </>
  );
}
