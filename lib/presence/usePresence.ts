'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { SINGLETON_TRIP_ID_CLIENT } from '@/lib/items/store';

export type PresenceState = { user_id: string; email: string; online_at: string };

export function usePresence(currentUserId: string | undefined) {
  const [others, setOthers] = useState<PresenceState[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`trip:${SINGLETON_TRIP_ID_CLIENT}:presence`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const list: PresenceState[] = [];
        for (const [key, metas] of Object.entries(state)) {
          if (key === currentUserId) continue;
          if (metas[0]) list.push(metas[0] as PresenceState);
        }
        setOthers(list);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            email: '',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return others;
}
