// Vercel Edge Function — same-origin CORS proxy
// Lives at /api/proxy on your deployed site.
// Runs on Vercel's Edge runtime, which resolves public DNS reliably
// (the Node serverless runtime fails here with getaddrinfo ENOTFOUND).
export const config = { runtime: 'edge' };

const ALLOWED = [
  'developer.nrel.gov',
  'geocoding.geo.census.gov',
  'services2.arcgis.com',
];

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export default async function handler(request) {
  const target = new URL(request.url).searchParams.get('url');
  if (!target) return json({ error: 'Missing url parameter' }, 400);

  let host;
  try {
    host = new URL(target).hostname;
  } catch (e) {
    return json({ error: 'Invalid url' }, 400);
  }
  if (!ALLOWED.includes(host)) {
    return json({ error: 'Host not allowed: ' + host }, 403);
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'Accept': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (compatible; PEC-Utility-Lookup/1.0; +https://pec-vert-delta.vercel.app)',
      },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (e) {
    return json({ error: 'Upstream fetch failed: ' + String(e) }, 502);
  }
}
