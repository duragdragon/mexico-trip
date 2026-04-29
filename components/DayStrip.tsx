'use client';
import Link from 'next/link';
import { tripDays, shortDay } from '@/lib/dates';

export default function DayStrip({ active }: { active: string }) {
  return (
    <div className="flex gap-[6px] px-5 pb-3 overflow-x-auto no-scrollbar">
      {tripDays().map((d) => {
        const isActive = d === active;
        return (
          <Link key={d} href={`/days/${d}`}
            className={`flex-shrink-0 px-[10px] py-[6px] rounded-[14px] text-[11px] font-semibold ${
              isActive ? 'bg-accent text-white' : 'bg-black/5 text-ink'
            }`}>
            {shortDay(d)}
          </Link>
        );
      })}
    </div>
  );
}
