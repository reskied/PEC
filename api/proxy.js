// Vercel Serverless Function — same-origin CORS proxy
// Lives at /api/proxy on your deployed site.
// Fetches the target URL server-side (no browser CORS) and returns the body.
export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  let host;
  try {
    host = new URL(target).hostname;
  } catch (e) {
    res.status(400).json({ error: 'Invalid url' });
    return;
  }
  const allowed = [
    'developer.nrel.gov',
    'geocoding.geo.census.gov',
    'services2.arcgis.com',
  ];
  if (!allowed.includes(host)) {
    res.status(403).json({ error: 'Host not allowed: ' + host });
    return;
  }
  try {
    const upstream = await fetch(target, {
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (compatible; PEC-Utility-Lookup/1.0; +https://pec-vert-delta.vercel.app)',
      },
    });
    const body = await upstream.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(upstream.status).send(body);
  } catch (e) {
    // Surface the underlying cause so we can see the real failure
    const cause = e && e.cause ? e.cause : {};
    res.status(502).json({
      error: 'Upstream fetch failed: ' + String(e),
      causeMessage: cause && cause.message ? String(cause.message) : '',
      causeCode: cause && cause.code ? String(cause.code) : '',
      errno: cause && cause.errno ? String(cause.errno) : '',
    });
  }
}
