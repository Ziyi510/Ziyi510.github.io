/* Adapted from ChenAnno/ChenAnno.github.io (MIT; assets/licenses/chenanno-LICENSE.txt).
   Count each IP once per rolling window. Store city aggregates and temporary
   keyed IP digests, never raw IP addresses. */
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
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return reply('Missing visitor address', 400);
      if (!env.IP_HASH_SECRET) return reply('Counter not configured', 503);
      const windowSeconds = Number(env.VISIT_WINDOW_SECONDS || 86400);
      if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) return reply('Invalid counter window', 503);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(env.IP_HASH_SECRET),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(ip));
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const now = Date.now(), cutoff = now - windowSeconds * 1000;
      const event = crypto.randomUUID();
      // The event token lets every subsequent write check whether THIS request
      // claimed the window. D1 executes this batch as one atomic transaction.
      const writes = [env.DB.prepare(
        'INSERT INTO visit_dedupe (ip_hash, last_counted, event_id) VALUES (?1, ?2, ?3) ' +
        'ON CONFLICT (ip_hash) DO UPDATE SET last_counted = excluded.last_counted, event_id = excluded.event_id ' +
        'WHERE visit_dedupe.last_counted <= ?4'
      ).bind(hash, now, event, cutoff), env.DB.prepare(
        "UPDATE totals SET n = n + 1 WHERE name = 'pageviews' " +
        'AND EXISTS (SELECT 1 FROM visit_dedupe WHERE ip_hash = ?1 AND event_id = ?2)'
      ).bind(hash, event)];
      {
        const cf = request.cf || {};
        const coordinate = (value, limit) => {
          if (value === null || value === undefined || value === '') return null;
          const n = Number(value);
          return Number.isFinite(n) && Math.abs(n) <= limit ? Math.round(n * 100) / 100 : null;
        };
        const lat = coordinate(cf.latitude, 90), lon = coordinate(cf.longitude, 180);
        const city = cf.city || '', cc = cf.country || 'XX';
        writes.push(env.DB.prepare(
          'INSERT INTO places (key, city, cc, lat, lon, n, last) SELECT ?1, ?2, ?3, ?4, ?5, 1, ?6 ' +
          'WHERE EXISTS (SELECT 1 FROM visit_dedupe WHERE ip_hash = ?7 AND event_id = ?8) ' +
          'ON CONFLICT (key) DO UPDATE SET n = n + 1, last = ?6'
        ).bind(`${cc}|${city}|${lat}|${lon}`, city, cc, lat, lon, now, hash, event));
      }
      writes.push(env.DB.prepare('DELETE FROM visit_dedupe WHERE last_counted <= ?1').bind(cutoff));
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
