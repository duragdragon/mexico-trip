export const TRIP_START = '2026-05-01';
export const TRIP_END = '2026-05-10';

export function tripDays(): string[] {
  const out: string[] = [];
  const start = new Date(TRIP_START);
  const end = new Date(TRIP_END);
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function shortDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getUTCDay()];
  return `${wd}${d.getUTCDate()}`;
}

export function longDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  return `${wd} ${d.getUTCDate()} ${mo}`;
}

export function dayIndex(iso: string): number {
  const days = tripDays();
  return days.indexOf(iso);
}
