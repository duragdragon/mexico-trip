'use client';
import { createClient } from '@/lib/supabase/browser';

export async function uploadAttachment(itemId: string, file: File): Promise<{ id: string; url: string } | { error: string }> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${itemId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('trip-attachments').upload(path, file);
  if (upErr) return { error: upErr.message };
  const kind = file.type === 'application/pdf' ? 'pdf' : 'image';
  const { data, error } = await supabase.from('attachment').insert({
    item_id: itemId, kind, storage_path: path, filename: file.name,
  }).select('id').single();
  if (error || !data) return { error: error?.message ?? 'insert failed' };

  const { data: signed } = await supabase.storage.from('trip-attachments').createSignedUrl(path, 60 * 60 * 24 * 7);
  return { id: data.id, url: signed?.signedUrl ?? '' };
}

export async function listAttachments(itemId: string) {
  const supabase = createClient();
  const { data } = await supabase.from('attachment').select('*').eq('item_id', itemId);
  if (!data) return [];
  return Promise.all(data.map(async (a) => {
    const { data: signed } = await supabase.storage.from('trip-attachments').createSignedUrl(a.storage_path, 60 * 60 * 24 * 7);
    return { ...a, url: signed?.signedUrl ?? '' };
  }));
}
