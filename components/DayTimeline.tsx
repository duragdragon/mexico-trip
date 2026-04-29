'use client';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';
import { useDayItems } from '@/lib/items/store';
import { updateItem } from '@/lib/items/mutate';
import SortableItemRow from './SortableItemRow';
import { getTravelTime, formatDuration } from '@/lib/travel-time/compute';

function GapMeta({ from, to }: { from: { lat: number; lng: number }; to: { lat: number; lng: number } }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getTravelTime(from.lat, from.lng, to.lat, to.lng).then((s) => {
      if (!cancelled && s != null) setText(formatDuration(s));
    });
    return () => { cancelled = true; };
  }, [from.lat, from.lng, to.lat, to.lng]);
  if (!text) return null;
  return <div className="ml-[56px] py-1 text-[10px] opacity-40 italic">↓ {text} by car</div>;
}

export default function DayTimeline({ date }: { date: string }) {
  const items = useDayItems(date);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 5 } }));

  if (!items) return <div className="px-5 text-muted text-sm">Loading…</div>;
  if (items.length === 0) return <div className="px-5 text-muted text-sm">Nothing scheduled. Tap + to add.</div>;

  async function onDragEnd(e: DragEndEvent) {
    if (!items) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx);
    await Promise.all(reordered.map((it, i) =>
      it.sort_order === i ? null : updateItem(it.id, { sort_order: i })
    ));
  }

  return (
    <div className="px-5">
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, idx) => {
            const next = items[idx + 1];
            const showGap = next && item.lat != null && item.lng != null && next.lat != null && next.lng != null;
            return (
              <div key={item.id}>
                <SortableItemRow item={item} />
                {showGap && <GapMeta from={{ lat: item.lat!, lng: item.lng! }} to={{ lat: next.lat!, lng: next.lng! }} />}
              </div>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
