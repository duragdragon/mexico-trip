'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { usePresence } from '@/lib/presence/usePresence';

function initial(email: string) {
  return email[0]?.toUpperCase() ?? '?';
}

export default function Avatars() {
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setMe({ id: data.user.id, email: data.user.email ?? '' });
      });
  }, []);

  const others = usePresence(me?.id);

  return (
    <div className="flex">
      {others.map((o) => (
        <div
          key={o.user_id}
          className="relative w-[26px] h-[26px] rounded-full bg-icon-stay text-white text-[11px] font-bold flex items-center justify-center border-2 border-bg"
        >
          {initial(o.email)}
          <span className="absolute -bottom-0 -right-0 w-2 h-2 rounded-full bg-icon-stay border border-bg" />
        </div>
      ))}
      {me && (
        <div className="relative w-[26px] h-[26px] rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center border-2 border-bg -ml-2">
          {initial(me.email)}
        </div>
      )}
    </div>
  );
}
