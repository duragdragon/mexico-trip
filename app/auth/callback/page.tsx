'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in…');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setStatus('No session. Redirecting…');
        router.replace('/sign-in?error=no_session');
        return;
      }
      try {
        await fetch('/auth/bootstrap', { method: 'POST', credentials: 'include' });
      } catch {/* non-fatal */}
      router.replace('/days/today');
    });
  }, [router]);

  return (
    <main className="min-h-dvh flex items-center justify-center text-muted">
      <p>{status}</p>
    </main>
  );
}
