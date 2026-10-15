/* Adapted from ChenAnno/ChenAnno.github.io (MIT; assets/licenses/chenanno-LICENSE.txt).
   Each page load counts as a view; the browser requests a place visit once per
   24 hours. Store city-level aggregates, never raw IP addresses. */
const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python/i;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': env.SITE_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const reply = (body, status = 200, extra = {}) => new Response(body, {
      status, headers: { ...headers, ...extra },
    });
    if (pathname !== '/api/visit' && pathname !== '/api/visitors') return reply('Not found', 404);
    if (request.method === 'OPTIONS') {
      return request.headers.get('Origin') === env.SITE_ORIGIN
        ? reply(null, 204) : reply('Forbidden', 403);
    }
    if (pathname === '/api/visit' && request.method === 'POST') {
      if (request.headers.get('Origin') !== env.SITE_ORIGIN) return reply('Forbidden', 403);
      if (BOTS.test(request.headers.get('User-Agent') || '')) return reply(null, 204);
      let data;
      try { data = await request.json(); } catch { return reply('Invalid JSON', 400); }
      const writes = [env.DB.prepare("UPDATE totals SET n = n + 1 WHERE name = 'pageviews'")];
      if (data && data.first === true) {
        const cf = request.cf || {};
        const coordinate = (value, limit) => {
          if (value === null || value === undefined || value === '') return null;
          const n = Number(value);
          return Number.isFinite(n) && Math.abs(n) <= limit ? Math.round(n * 100) / 100 : null;
        };
        const lat = coordinate(cf.latitude, 90), lon = coordinate(cf.longitude, 180);
        const city = cf.city || '', cc = cf.country || 'XX';
        writes.push(env.DB.prepare(
          'INSERT INTO places (key, city, cc, lat, lon, n, last) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6) ' +
          'ON CONFLICT (key) DO UPDATE SET n = n + 1, last = ?6'
        ).bind(`${cc}|${city}|${lat}|${lon}`, city, cc, lat, lon, Date.now()));
      }
      await env.DB.batch(writes);
      return reply(null, 204);
    }
    if (pathname === '/api/visitors' && request.method === 'GET') {
      const [places, totals] = await env.DB.batch([
        env.DB.prepare('SELECT city, cc, lat, lon, n FROM places ORDER BY n DESC'),
        env.DB.prepare("SELECT n FROM totals WHERE name = 'pageviews'"),
      ]);
      return reply(JSON.stringify({
        pageviews: totals.results[0]?.n || 0,
        visits: places.results.reduce((sum, p) => sum + p.n, 0),
        places: places.results.filter(p => p.lat !== null && p.lon !== null),
      }), 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
    }
    return reply('Method not allowed', 405);
  },
};
