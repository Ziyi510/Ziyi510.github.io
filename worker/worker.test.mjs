import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/index.mjs';
const site = 'https://ziyi510.github.io';
function setup(results = []) {
  const batches = [];
  return { batches, env: { SITE_ORIGIN: site, DB: {
    prepare(sql) { return { sql, bind(...values) { this.values = values; return this; } }; },
    async batch(items) { batches.push(items); return results; },
  } } };
}
function visit(origin = site, first = true) {
  const request = new Request('https://example.workers.dev/api/visit', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ first }),
  });
  request.cf = { country: 'SG', city: 'Singapore', latitude: '1.3521', longitude: '103.8198' };
  return request;
}
test('cross-origin preflight permits the homepage; local previews cannot count', async () => {
  const { env, batches } = setup();
  const allowed = await worker.fetch(new Request('https://example.workers.dev/api/visit', { method: 'OPTIONS', headers: { Origin: site } }), env);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), site);
  assert.equal((await worker.fetch(visit('http://localhost:4000'), env)).status, 403);
  assert.equal(batches.length, 0);
});
test('first visit writes aggregate location; repeat only increments page views', async () => {
  const { env, batches } = setup();
  assert.equal((await worker.fetch(visit(), env)).status, 204);
  assert.equal(batches[0].length, 2);
  assert.deepEqual(batches[0][1].values.slice(1, 5), ['Singapore', 'SG', 1.35, 103.82]);
  await worker.fetch(visit(site, false), env);
  assert.equal(batches[1].length, 1);
});
test('unknown coordinates do not become zero and bots do not count', async () => {
  const { env, batches } = setup();
  const request = visit(); request.cf = {};
  await worker.fetch(request, env);
  assert.deepEqual(batches[0][1].values.slice(3, 5), [null, null]);
  const bot = visit(); bot.headers.set('User-Agent', 'Googlebot');
  await worker.fetch(bot, env);
  assert.equal(batches.length, 1);
});
test('public statistics include unknown-location visits without drawing them', async () => {
  const { env } = setup([{ results: [{ city: 'Singapore', cc: 'SG', lat: 1.35, lon: 103.82, n: 3 }, { lat: null, lon: null, n: 2 }] }, { results: [{ n: 8 }] }]);
  const response = await worker.fetch(new Request('https://example.workers.dev/api/visitors'), env);
  const data = await response.json();
  assert.equal(data.pageviews, 8); assert.equal(data.visits, 5); assert.equal(data.places.length, 1);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
});
