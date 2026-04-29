'use client';
import { useEffect, useState } from 'react';
import { uploadAttachment, listAttachments } from '@/lib/attachments/upload';

type Att = { id: string; kind: string; filename: string; url: string };

export default function Attachments({ itemId }: { itemId: string }) {
  const [items, setItems] = useState<Att[]>([]);
  useEffect(() => { listAttachments(itemId).then((r) => setItems(r as Att[])); }, [itemId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = await uploadAttachment(itemId, f);
    if ('error' in r) { alert(r.error); return; }
    setItems((prev) => [...prev, { id: r.id, kind: f.type === 'application/pdf' ? 'pdf' : 'image', filename: f.name, url: r.url }]);
  }

  return (
    <div className="border-t border-rule py-[10px]">
      <div className="text-[9px] tracking-[1.5px] uppercase text-muted mb-[6px]">Attachments</div>
      <div className="space-y-2">
        {items.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
             className="flex items-center gap-2 text-[13px]">
            <span className="bg-accent text-white px-[6px] py-[2px] rounded-[3px] text-[9px] uppercase font-bold">{a.kind}</span>
            <span className="underline">{a.filename}</span>
          </a>
        ))}
      </div>
      <label className="inline-block mt-3 px-3 py-1.5 rounded border border-rule text-xs cursor-pointer">
        + Add file
        <input type="file" hidden accept="application/pdf,image/*" onChange={onUpload} />
      </label>
    </div>
  );
}
