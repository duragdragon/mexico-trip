import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ItemDetail from '@/components/ItemDetail';
import type { Item } from '@/lib/types';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('item').select('*').eq('id', id).maybeSingle();
  if (error || !data) notFound();
  return <ItemDetail item={data as Item} />;
}
