import type { Item } from '@/lib/types';

const HERO_GRADIENT: Record<Item['kind'], string> = {
  flight:   'from-accent to-[#e8a679]',
  lodging:  'from-icon-stay to-[#8aa890]',
  activity: 'from-icon-see to-[#e8c878]',
  food:     'from-icon-eat to-[#c08560]',
};
const KIND_LABEL: Record<Item['kind'], string> = {
  flight: 'FLY', lodging: 'STAY', activity: 'SEE', food: 'EAT',
};

export default function ItemHero({ item }: { item: Item }) {
  return (
    <div className={`h-[200px] bg-gradient-to-br ${HERO_GRADIENT[item.kind]} relative`}
         style={item.photo_url ? { backgroundImage: `url(${item.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      <div className="absolute bottom-3 left-4 bg-ink/85 text-bg px-[10px] py-[4px] rounded-[12px] text-[9px] font-bold uppercase tracking-[1px]">
        {KIND_LABEL[item.kind]}{item.scheduled_date ? ` · ${item.scheduled_date}` : ''}
      </div>
    </div>
  );
}
