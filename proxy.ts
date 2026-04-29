import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const TRIP_START = new Date('2026-05-01');
const TRIP_END = new Date('2026-05-10');

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/days/today') {
    const now = new Date();
    let target = now;
    if (now < TRIP_START) target = TRIP_START;
    else if (now > TRIP_END) target = TRIP_END;
    const iso = target.toISOString().slice(0, 10);
    const url = request.nextUrl.clone();
    url.pathname = `/days/${iso}`;
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
