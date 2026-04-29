import { tripDays, longDay, dayIndex } from '@/lib/dates';
import DayStrip from '@/components/DayStrip';
import DayTimeline from '@/components/DayTimeline';
import Avatars from '@/components/Avatars';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function DaysPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!tripDays().includes(date)) notFound();
  const idx = dayIndex(date);

  return (
    <main>
      <div className="flex justify-between items-center px-5 pt-4 pb-2">
        <div className="text-[10px] uppercase tracking-[1.5px] text-muted">
          Mexico · Day {idx + 1} of 10
        </div>
        <Avatars />
      </div>
      <h1 className="serif font-normal text-[26px] leading-tight px-5 pb-2">{longDay(date)}</h1>
      <DayStrip active={date} />
      <DayTimeline date={date} />
      <Link href={`/item/new?date=${date}`}
            className="fixed bottom-[100px] right-5 w-14 h-14 rounded-full bg-accent text-white text-2xl flex items-center justify-center shadow-lg z-40">
        +
      </Link>
    </main>
  );
}
