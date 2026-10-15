import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './src/index.mjs';
const site = 'https://ziyi510.github.io';
const day = 86400000;
function setup(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const clock = { now: 1800000000000 };
  t.mock.method(Date, 'now', () => clock.now);
  const env = { SITE_ORIGIN: site, IP_HASH_SECRET: 'test-only-secret', VISIT_WINDOW_SECONDS: '86400', DB: {
    prepare(sql) { return { sql, values: [], bind(...values) { this.values = values; return this; } }; },
    async batch(items) {
      db.exec('BEGIN');
      try {
        const results = items.map(({ sql, values }) => ({ results: db.prepare(sql).all(
          Object.fromEntries(values.map((value, i) => [String(i + 1), value]))
        ) }));
        db.exec('COMMIT');
        return results;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  } };
  return { db, env, clock, count: () => db.prepare("SELECT n FROM totals WHERE name = 'pageviews'").get().n };
}
function visit(ip = '192.0.2.1', origin = site) {
  const request = new Request('https://example.workers.dev/api/visit', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', 'CF-Connecting-IP': ip },
    body: JSON.stringify({ first: false }), // Cached clients cannot override server-side counting.
  });
  request.cf = { country: 'SG', city: 'Singapore', latitude: '1.3521', longitude: '103.8198' };
  return request;
}
async function stats(env) {
  return worker.fetch(new Request('https://example.workers.dev/api/visitors'), env);
}
test('same IP counts once, refresh does not extend window, exact 24h counts again', async t => {
  const { env, clock, count, db } = setup(t);
  assert.equal((await worker.fetch(visit(), env)).status, 204);
  const first = clock.now;
  clock.now = first + day - 1;
  await worker.fetch(visit(), env);
  assert.equal(count(), 1);
  assert.equal(db.prepare('SELECT last_counted FROM visit_dedupe').get().last_counted, first);
  clock.now = first + day;
  await worker.fetch(visit(), env);
  assert.equal(count(), 2);
  assert.equal((await (await stats(env)).json()).visits, 2);
});
test('simultaneous requests from one IP count once; another IP counts separately', async t => {
  const { env, count, db } = setup(t);
  await Promise.all(Array.from({ length: 20 }, () => worker.fetch(visit(), env)));
  assert.equal(count(), 1);
  await worker.fetch(visit('2001:db8::1'), env);
  assert.equal(count(), 2);
  const rows = db.prepare('SELECT * FROM visit_dedupe').all();
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => /^[a-f0-9]{64}$/.test(row.ip_hash)));
  assert.ok(!JSON.stringify(rows).includes('192.0.2.1'));
  const data = await (await stats(env)).json();
  assert.equal(data.visits, 2);
  assert.deepEqual(data.places[0], { city: 'Singapore', cc: 'SG', lat: 1.35, lon: 103.82, n: 2 });
  assert.ok(!JSON.stringify(data).includes('ip_hash'));
});
test('preflight, forbidden origins, bots, missing IP and missing secret never count', async t => {
  const { env, count } = setup(t);
  const allowed = await worker.fetch(new Request('https://example.workers.dev/api/visit', { method: 'OPTIONS', headers: { Origin: site } }), env);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), site);
  assert.equal((await worker.fetch(visit('192.0.2.1', 'http://localhost:4000'), env)).status, 403);
  const bot = visit(); bot.headers.set('User-Agent', 'Googlebot');
  assert.equal((await worker.fetch(bot, env)).status, 204);
  const missing = visit(); missing.headers.delete('CF-Connecting-IP');
  assert.equal((await worker.fetch(missing, env)).status, 400);
  assert.equal((await worker.fetch(visit(), { ...env, IP_HASH_SECRET: '' })).status, 503);
  assert.equal(count(), 0);
});
test('unknown locations count but are not plotted; existing totals survive migration', async t => {
  const { env, db, count } = setup(t);
  db.exec("UPDATE totals SET n = 8 WHERE name = 'pageviews'");
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  assert.equal(count(), 8);
  const request = visit(); request.cf = {};
  await worker.fetch(request, env);
  const response = await stats(env);
  assert.deepEqual(await response.json(), { pageviews: 9, visits: 1, places: [] });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});
test('expired digests are removed on subsequent traffic', async t => {
  const { env, db, clock, count } = setup(t);
  await worker.fetch(visit(), env);
  clock.now += day;
  await worker.fetch(visit('192.0.2.2'), env);
  assert.equal(count(), 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visit_dedupe').get().n, 1);
});
test('a failed location write rolls back both the counter and dedupe claim', async t => {
  const { env, db, count } = setup(t);
  db.exec("CREATE TRIGGER fail_place BEFORE INSERT ON places BEGIN SELECT RAISE(ABORT, 'test failure'); END");
  await assert.rejects(worker.fetch(visit(), env), /test failure/);
  assert.equal(count(), 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visit_dedupe').get().n, 0);
  db.exec('DROP TRIGGER fail_place');
  await worker.fetch(visit(), env);
  assert.equal(count(), 1);
});
