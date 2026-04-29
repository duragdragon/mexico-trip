'use server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { ensureTrip } from '@/lib/trip/bootstrap';

export async function signInOrSignUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || password.length < 8) {
    return { error: 'Email + password (min 8 chars) required' };
  }

  const supabase = await createServerClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError && signInData.user) {
    try { await ensureTrip(supabase, signInData.user.id); } catch (e) { console.error('bootstrap', e); }
    return { ok: true };
  }

  const isNoUser = /invalid login|invalid credentials|user not found/i.test(signInError?.message ?? '');
  if (!isNoUser) return { error: signInError?.message ?? 'Sign-in failed' };

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (createErr || !created.user) return { error: createErr?.message ?? 'Could not create account' };

  const { data: secondTry, error: secondErr } = await supabase.auth.signInWithPassword({ email, password });
  if (secondErr || !secondTry.user) return { error: secondErr?.message ?? 'Account created but sign-in failed' };

  try { await ensureTrip(supabase, secondTry.user.id); } catch (e) { console.error('bootstrap', e); }
  return { ok: true };
}
