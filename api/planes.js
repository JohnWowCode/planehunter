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

  // The client already snaps to this grid before asking, which is what makes the
  // cache work: the CDN keys on the whole URL, so callers only share a cached
  // response if they share the query string. Snapping again here is belt and
  // braces for anyone hitting the endpoint directly.
  const gLat = (Math.round(lat / 0.1) * 0.1).toFixed(1);
  const gLon = (Math.round(lon / 0.1) * 0.1).toFixed(1);
  const upstream = `https://api.airplanes.live/v2/point/${gLat}/${gLon}/${radius}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'plane-hunter (hobby project)' },
    });
    if (!res.ok) {
      // Let a brief upstream hiccup be served from the existing cached copy
      // rather than punching through to airplanes.live on every retry.
      return json({ error: `upstream ${res.status}`, ac: [] }, 502, {
        'Cache-Control': 'public, s-maxage=5',
      });
    }
    const data = await res.json();
    // Matches the client's 10s poll: a poll landing inside the window is served
    // by the CDN and never reaches this function or airplanes.live at all.
    return json(data, 200, {
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=50',
    });
  } catch (e) {
    return json({ error: 'upstream unreachable', ac: [] }, 504, {
      'Cache-Control': 'public, s-maxage=5',
    });
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
