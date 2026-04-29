import { NextResponse, type NextRequest } from 'next/server';

const TRIP_START = new Date('2026-05-01');
const TRIP_END = new Date('2026-05-10');

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/days/today') {
    const now = new Date();
    let target = now;
    if (now < TRIP_START) target = TRIP_START;
    else if (now > TRIP_END) target = TRIP_END;
    const iso = target.toISOString().slice(0, 10);
    const url = req.nextUrl.clone();
    url.pathname = `/days/${iso}`;
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ['/days/today'] };
