'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAllItems } from '@/lib/items/store';
import { tripDays } from '@/lib/dates';
import type { Item } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STYLE = 'mapbox://styles/mapbox/light-v11';

export default function MapView() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const allItems = useAllItems();
  const [filter, setFilter] = useState<string>('today');
  const [selected, setSelected] = useState<Item | null>(null);

  const handleLongPress = useCallback(async (lngLat: mapboxgl.LngLat) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const reverse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${token}&limit=1`
    ).then((r) => r.json());
    const feature = reverse.features?.[0];
    const title = feature?.text ?? 'New pin';
    const address = feature?.place_name ?? '';

    const id = crypto.randomUUID();
    const { insertItem } = await import('@/lib/items/mutate');
    const { SINGLETON_TRIP_ID_CLIENT } = await import('@/lib/items/store');
    await insertItem({
      id, trip_id: SINGLETON_TRIP_ID_CLIENT,
      kind: 'activity', title, scheduled_date: null,
      start_time: null, end_time: null, sort_order: 0,
      address, lat: lngLat.lat, lng: lngLat.lng,
      mapbox_place_id: feature?.id ?? null, photo_url: null,
      opening_hours: null, details: {}, updated_by: null,
    });
  }, []);

  // Initialise map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: STYLE,
      center: [-99.1635, 19.4178],
      zoom: 11,
    });
    mapRef.current = map;
  }, []);

  // Long-press handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressLngLat: mapboxgl.LngLat | null = null;

    const onDown = (e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
      pressLngLat = e.lngLat;
      pressTimer = setTimeout(() => {
        if (pressLngLat) void handleLongPress(pressLngLat);
      }, 600);
    };
    const cancel = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };

    map.on('touchstart', onDown);
    map.on('mousedown', onDown);
    map.on('touchend', cancel);
    map.on('mouseup', cancel);
    map.on('move', cancel);
    return () => {
      map.off('touchstart', onDown);
      map.off('mousedown', onDown);
      map.off('touchend', cancel);
      map.off('mouseup', cancel);
      map.off('move', cancel);
    };
  }, [handleLongPress]);

  // Render markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !allItems) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    let visible = allItems.filter((i) => i.lat != null && i.lng != null);
    if (filter === 'wishlist') {
      visible = visible.filter((i) => i.scheduled_date === null);
    } else if (filter !== 'all') {
      const date = filter === 'today' ? tripDays()[0] : filter;
      visible = visible.filter((i) => i.scheduled_date === date);
    }

    const ordered = visible.slice().sort((a, b) => a.sort_order - b.sort_order);

    ordered.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'pin-marker';
      el.style.cssText = `
        width: 26px; height: 26px; border-radius: 50%;
        background: #c45f3c; color: white; font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        border: 3px solid #faf5ee; box-shadow: 0 3px 6px rgba(0,0,0,0.25);
        cursor: pointer;
      `;
      el.textContent = String(idx + 1);
      el.onclick = () => setSelected(item);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([item.lng!, item.lat!])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (ordered.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      ordered.forEach((i) => bounds.extend([i.lng!, i.lat!]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
    }
  }, [allItems, filter]);

  return (
    <div className="relative h-[calc(100dvh-88px)]">
      <div ref={mapEl} className="absolute inset-0" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg rounded-[18px] px-4 py-2 text-[11px] font-semibold shadow">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent">
          <option value="today">Today</option>
          <option value="all">Whole trip</option>
          <option value="wishlist">Wishlist only</option>
          {tripDays().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {selected && <PinCard item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PinCard({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-bg rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[9px] uppercase tracking-[1.5px] text-muted">{item.kind}</div>
          <div className="serif font-semibold text-base">{item.title}</div>
          <div className="text-[11px] text-muted">{item.address}</div>
        </div>
        <button onClick={onClose} className="text-muted">&#x2715;</button>
      </div>
      <div className="flex gap-[6px] mt-3">
        <a href={`/item/${item.id}`} className="bg-ink text-bg px-[10px] py-[6px] rounded-[14px] text-[10px] font-semibold">Open</a>
        {item.lat && item.lng && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}
            target="_blank"
            rel="noreferrer"
            className="bg-black/5 px-[10px] py-[6px] rounded-[14px] text-[10px] font-semibold"
          >
            Directions
          </a>
        )}
      </div>
    </div>
  );
}
