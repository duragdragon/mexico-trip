import { createClient } from '@/lib/supabase/server';
import { SINGLETON_TRIP_ID } from '@/lib/trip/bootstrap';
import { SEED_ITEMS } from '@/supabase/seed-data';
import type { Json } from '@/lib/supabase/types';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const { data: membership } = await supabase
    .from('trip_member').select('role')
    .eq('trip_id', SINGLETON_TRIP_ID).eq('user_id', user.id).maybeSingle();
  if (membership?.role !== 'owner') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { data: existing } = await supabase
    .from('item').select('title').eq('trip_id', SINGLETON_TRIP_ID);
  const existingTitles = new Set((existing ?? []).map((r) => r.title));

  const toInsert = SEED_ITEMS.filter((i) => !existingTitles.has(i.title)).map((i) => ({
    ...i,
    details: i.details as unknown as Json,
    trip_id: SINGLETON_TRIP_ID,
    updated_by: user.id,
  }));
  if (toInsert.length === 0) return NextResponse.json({ inserted: 0 });

  const { error } = await supabase.from('item').insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: toInsert.length });
}
