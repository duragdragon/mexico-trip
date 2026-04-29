'use client';
import { createClient } from '@/lib/supabase/browser';

const ROUND = 5; // 5 decimal places ~ 1m
const round = (n: number) => Number(n.toFixed(ROUND));

export async function getTravelTime(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<number | null> {
  const fl = round(fromLat), fL = round(fromLng), tl = round(toLat), tL = round(toLng);
  const supabase = createClient();

  const { data: cached } = await supabase
    .from('travel_time_cache')
    .select('duration_seconds, cached_at')
    .eq('from_lat', fl).eq('from_lng', fL).eq('to_lat', tl).eq('to_lng', tL).eq('mode', 'driving')
    .maybeSingle();

  if (cached) {
    const ageDays = (Date.now() - new Date(cached.cached_at).getTime()) / 86400000;
    if (ageDays < 7) return cached.duration_seconds;
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fL},${fl};${tL},${tl}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&overview=false`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const seconds: number | undefined = j.routes?.[0]?.duration;
    if (typeof seconds !== 'number') return null;
    await supabase.from('travel_time_cache').upsert({
      from_lat: fl, from_lng: fL, to_lat: tl, to_lng: tL, mode: 'driving',
      duration_seconds: Math.round(seconds), cached_at: new Date().toISOString(),
    });
    return Math.round(seconds);
  } catch { return null; }
}

export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60 / 5) * 5;
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}
