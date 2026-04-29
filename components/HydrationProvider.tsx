'use client';
import { useEffect } from 'react';
import { hydrateFromServer } from '@/lib/items/sync';

export default function HydrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateFromServer().catch((e) => console.error('hydrate failed', e));
  }, []);
  return <>{children}</>;
}
