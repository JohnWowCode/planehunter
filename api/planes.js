// Proxies airplanes.live so the browser is not blocked by CORS, and caches at
// Vercel's edge so a hundred players in one city collapse into one upstream call.
// airplanes.live is rate limited to 1 request per second and is non-commercial only.
// If you use this, feed the network back: https://airplanes.live/

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const radius = Math.min(250, Math.max(1, Math.round(Number(url.searchParams.get('radius')) || 40)));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return json({ error: 'lat and lon are required and must be valid coordinates' }, 400);
  }

  // Snap the query to a coarse grid so nearby players share one cached response.
  const gLat = lat.toFixed(1);
  const gLon = lon.toFixed(1);
  const upstream = `https://api.airplanes.live/v2/point/${gLat}/${gLon}/${radius}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'plane-hunter (hobby project)' },
      // Vercel's edge cache: serve for 8s, keep serving stale for 30s while revalidating.
      cf: { cacheTtl: 8 },
    });
    if (!res.ok) return json({ error: `upstream ${res.status}`, ac: [] }, 502);
    const data = await res.json();
    return json(data, 200, {
      'Cache-Control': 'public, s-maxage=8, stale-while-revalidate=30',
    });
  } catch (e) {
    return json({ error: 'upstream unreachable', ac: [] }, 504);
  }
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extra,
    },
  });
}
