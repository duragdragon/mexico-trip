'use client';
import { useState } from 'react';

export default function TripPage() {
  const [status, setStatus] = useState('');
  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">Trip</h1>
      <button onClick={async () => {
        const r = await fetch('/trip/seed', { method: 'POST' });
        setStatus(await r.text());
      }} className="px-4 py-2 bg-accent text-white rounded">Seed data</button>
      <pre>{status}</pre>
    </main>
  );
}
