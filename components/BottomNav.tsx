'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { label: 'Days', href: '/days/today', match: '/days' },
  { label: 'Map', href: '/map', match: '/map' },
  { label: 'Wishlist', href: '/wishlist', match: '/wishlist' },
  { label: 'Trip', href: '/trip', match: '/trip' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 h-[88px] pt-2 pb-6 bg-bg/95 backdrop-blur border-t border-rule flex justify-around items-start z-50">
      {items.map((item) => {
        const active = path.startsWith(item.match);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[11px] ${active ? 'text-accent font-semibold' : 'text-muted'}`}
          >
            <span className="text-xl leading-none">
              {item.label === 'Days' && '▤'}
              {item.label === 'Map' && '⌖'}
              {item.label === 'Wishlist' && '★'}
              {item.label === 'Trip' && '✈'}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
