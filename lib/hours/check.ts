import type { Item, OpeningHours } from '@/lib/types';

export type HoursStatus =
  | { kind: 'closed_day'; reason: string }
  | { kind: 'closing_soon'; minutesUntilClose: number }
  | { kind: 'open' }
  | { kind: 'unknown' };

export function checkHours(item: Item, now: Date): HoursStatus {
  if (!item.opening_hours || !item.scheduled_date) return { kind: 'unknown' };
  const oh = item.opening_hours as OpeningHours;
  const dt = new Date(item.scheduled_date + 'T00:00:00');
  const dow = (dt.getDay() + 6) % 7; // Mon=0
  const todaySpec = oh.weekly[dow];
  if (!todaySpec) return { kind: 'closed_day', reason: 'closed on this day' };

  if (item.scheduled_date === now.toISOString().slice(0, 10)) {
    const closeMin = parseHHMM(todaySpec.close);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const delta = closeMin - nowMin;
    if (delta > 0 && delta <= 60) return { kind: 'closing_soon', minutesUntilClose: delta };
  }

  return { kind: 'open' };
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m ?? 0);
}
