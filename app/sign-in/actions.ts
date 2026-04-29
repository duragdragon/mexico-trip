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

  let userId: string | null = null;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });

  if (createErr) {
    const alreadyExists = /already (registered|been registered|exists)|email_exists|user_already/i.test(createErr.message);
    if (!alreadyExists) return { error: createErr.message };

    // User exists (likely from earlier magic-link signup, no password set).
    // Find them and set the password.
    let foundId: string | null = null;
    let page = 1;
    while (page < 10 && !foundId) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      foundId = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (!list?.users || list.users.length < 200) break;
      page++;
    }
    if (!foundId) return { error: 'User exists but could not be located' };

    const { error: updateErr } = await admin.auth.admin.updateUserById(foundId, {
      password, email_confirm: true,
    });
    if (updateErr) return { error: updateErr.message };
    userId = foundId;
  } else if (created?.user) {
    userId = created.user.id;
  }

  if (!userId) return { error: 'Could not establish account' };

  const { data: secondTry, error: secondErr } = await supabase.auth.signInWithPassword({ email, password });
  if (secondErr || !secondTry.user) return { error: secondErr?.message ?? 'Account ready but sign-in failed' };

  try { await ensureTrip(supabase, secondTry.user.id); } catch (e) { console.error('bootstrap', e); }
  return { ok: true };
}
