'use client';
import { useState } from 'react';
import Link from 'next/link';
import { prefetchTripTiles } from '@/lib/offline/prefetch-tiles';

export default function TripPage() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [mapsDone, setMapsDone] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');

  async function downloadTiles() {
    setProgress({ done: 0, total: 0 });
    await prefetchTripTiles((d, t) => setProgress({ done: d, total: t }));
    setMapsDone(true);
  }

  return (
    <main className="p-5">
      <h1 className="serif text-2xl mb-4">Trip</h1>

      <Link
        href="/trip/invite"
        className="block px-4 py-3 rounded-lg border border-rule mb-3 text-ink"
      >
        Invite Débora
      </Link>

      <button
        onClick={downloadTiles}
        disabled={!!progress && !mapsDone}
        className="block w-full px-4 py-3 rounded-lg bg-accent text-white font-semibold mb-3 disabled:opacity-60"
      >
        {mapsDone ? 'Map downloaded ✓' : 'Download maps for offline'}
      </button>

      {progress && !mapsDone && (
        <div className="mb-3 text-sm text-muted">
          Downloading… {progress.done}/{progress.total || '?'}
        </div>
      )}

      {/* Seed button — remove after trip data is confirmed */}
      <button
        onClick={async () => {
          const r = await fetch('/trip/seed', { method: 'POST' });
          setSeedStatus(await r.text());
        }}
        className="px-4 py-2 bg-accent text-white rounded text-sm opacity-60"
      >
        Seed data
      </button>
      {seedStatus && <pre className="mt-2 text-xs">{seedStatus}</pre>}
    </main>
  );
}
