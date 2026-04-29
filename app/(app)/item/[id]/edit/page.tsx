import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ItemEditForm from '@/components/ItemEditForm';
import type { Item } from '@/lib/types';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('item').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return <ItemEditForm item={data as Item} />;
}
