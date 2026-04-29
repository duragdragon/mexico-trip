import { createServerClient } from '@supabase/ssr';
import { ensureTrip } from '@/lib/trip/bootstrap';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/days/today';

  if (!code) return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error?.message ?? 'no_user')}`);
  }

  try {
    await ensureTrip(supabase, data.user.id);
  } catch (e) {
    console.error('bootstrap failed', e);
  }

  return response;
}
