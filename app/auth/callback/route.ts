import { createClient } from '@/lib/supabase/server';
import { ensureTrip } from '@/lib/trip/bootstrap';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/days/today';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      try { await ensureTrip(supabase, data.user.id); } catch (e) { console.error('bootstrap failed', e); }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
