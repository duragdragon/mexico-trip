'use server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSb } from '@supabase/supabase-js';
import { SINGLETON_TRIP_ID } from '@/lib/trip/bootstrap';
import { headers } from 'next/headers';

export async function inviteUser(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email required' };

  // Caller must be authed and the trip owner
  const userClient = await createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { data: membership } = await userClient
    .from('trip_member')
    .select('role')
    .eq('trip_id', SINGLETON_TRIP_ID)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membership?.role !== 'owner') return { error: 'Only the owner can invite' };

  const admin = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const origin = (await headers()).get('origin') ?? 'http://localhost:3000';

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  const userId = invited.user?.id;
  if (userId) {
    await admin.from('trip_member').upsert(
      { trip_id: SINGLETON_TRIP_ID, user_id: userId, role: 'editor' },
      { onConflict: 'trip_id,user_id' },
    );
  }
  return { ok: true };
}
