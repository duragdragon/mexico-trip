'use client';
import { useState } from 'react';
import { signInWithEmail } from './actions';

export default function SignInPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await signInWithEmail(formData);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-8 text-center">
        <h1 className="serif text-3xl mb-4">Check your inbox</h1>
        <p className="text-muted">We sent you a sign-in link.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8">
      <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · May 2026</div>
      <h1 className="serif text-4xl mt-2 mb-8">Sign in</h1>
      <form action={onSubmit} className="w-full max-w-sm space-y-4">
        <input
          name="email"
          type="email"
          required
          placeholder="you@somewhere.com"
          className="w-full px-4 py-3 rounded-lg border border-rule bg-bg"
          autoFocus
        />
        <button
          type="submit"
          className="w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold"
        >
          Send magic link
        </button>
        {error && <p className="text-accent-text text-sm">{error}</p>}
      </form>
    </main>
  );
}
