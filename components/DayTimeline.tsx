'use client';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDayItems } from '@/lib/items/store';
import { updateItem } from '@/lib/items/mutate';
import SortableItemRow from './SortableItemRow';

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
          {items.map((item) => <SortableItemRow key={item.id} item={item} />)}
        </SortableContext>
      </DndContext>
    </div>
  );
}
