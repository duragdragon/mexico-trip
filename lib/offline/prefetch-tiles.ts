'use client';

const TILE_BASE = 'https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles';

const REGIONS = [
  { name: 'CDMX', bbox: [-99.22, 19.34, -99.10, 19.46], zooms: [10, 11, 12, 13, 14, 15] },
  { name: 'Tulum', bbox: [-87.55, 20.10, -87.40, 20.25], zooms: [10, 11, 12, 13, 14, 15] },
];

function lonToTileX(lon: number, z: number) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}

function latToTileY(lat: number, z: number) {
  const rad = lat * Math.PI / 180;
  return Math.floor(
    (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z)
  );
}

export async function prefetchTripTiles(
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const cache = await caches.open('mapbox-tiles');
  const urls: string[] = [];

  for (const r of REGIONS) {
    for (const z of r.zooms) {
      const xMin = lonToTileX(r.bbox[0], z);
      const xMax = lonToTileX(r.bbox[2], z);
      const yMin = latToTileY(r.bbox[3], z);
      const yMax = latToTileY(r.bbox[1], z);
      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          urls.push(`${TILE_BASE}/${z}/${x}/${y}?access_token=${token}`);
        }
      }
    }
  }

  let done = 0;
  const concurrency = 6;
  let cursor = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        try {
          const cached = await cache.match(url);
          if (!cached) {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          }
        } catch {
          // ignore individual tile failures
        }
        done++;
        onProgress?.(done, urls.length);
      }
    })
  );
}
