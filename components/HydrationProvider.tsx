'use client';
import { useEffect } from 'react';
import { hydrateFromServer } from '@/lib/items/sync';
import { subscribeToItems } from '@/lib/items/realtime';
import { flushQueue } from '@/lib/items/mutate';

export default function HydrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateFromServer().catch((e) => console.error('hydrate failed', e));
    flushQueue();
    return subscribeToItems();
  }, []);
  return <>{children}</>;
}
