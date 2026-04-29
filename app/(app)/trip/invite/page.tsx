'use client';
import { useState } from 'react';
import { inviteUser } from './actions';

export default function InvitePage() {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setStatus('idle');
    setError(null);
    const result = await inviteUser(formData);
    if (result.error) { setError(result.error); setStatus('error'); }
    else setStatus('sent');
  }

  return (
    <main className="p-5">
      <div className="text-[10px] uppercase tracking-[1.5px] text-muted">Mexico · invite</div>
      <h1 className="serif text-3xl mt-2 mb-6">Invite Débora</h1>
      <form action={onSubmit} className="space-y-4 max-w-sm">
        <input name="email" type="email" required placeholder="debora@..."
          className="w-full px-4 py-3 rounded-lg border border-rule bg-bg" />
        <button type="submit" className="w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold">
          Send invite
        </button>
        {status === 'sent' && <p className="text-icon-stay">Invite sent.</p>}
        {error && <p className="text-accent-text">{error}</p>}
      </form>
    </main>
  );
}
