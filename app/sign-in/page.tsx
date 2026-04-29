'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInOrSignUp } from './actions';

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setBusy(true);
    const result = await signInOrSignUp(formData);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.replace('/days/today');
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8">
      <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · May 2026</div>
      <h1 className="serif text-4xl mt-2 mb-8">Sign in</h1>
      <form action={onSubmit} className="w-full max-w-sm space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@somewhere.com"
          className="w-full px-4 py-3 rounded-lg border border-rule bg-bg"
          autoFocus
          autoComplete="email"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 chars)"
          className="w-full px-4 py-3 rounded-lg border border-rule bg-bg"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[11px] text-muted text-center pt-2">
          First time? It'll create your account automatically.
        </p>
        {error && <p className="text-accent-text text-sm">{error}</p>}
      </form>
    </main>
  );
}
