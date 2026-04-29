import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { TRIP_META } from '@/supabase/seed-data';

const TRIP_ID = '00000000-0000-0000-0000-000000000001';

export async function ensureTrip(supabase: SupabaseClient<Database>, userId: string) {
  // Idempotent: insert trip if missing, insert membership if missing.
  const { data: existing } = await supabase
    .from('trip')
    .select('id')
    .eq('id', TRIP_ID)
    .maybeSingle();

  if (!existing) {
    const { error: tripErr } = await supabase
      .from('trip')
      .insert({ id: TRIP_ID, ...TRIP_META });
    if (tripErr) throw tripErr;
  }

  await supabase
    .from('trip_member')
    .upsert({ trip_id: TRIP_ID, user_id: userId, role: 'owner' }, { onConflict: 'trip_id,user_id' });

  return TRIP_ID;
}

export const SINGLETON_TRIP_ID = TRIP_ID;
