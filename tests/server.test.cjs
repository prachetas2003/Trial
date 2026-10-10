const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server.cjs');

test('static server serves the product and prevents repo access', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(base + '/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.match(await home.text(), /Tiny friends/);
  for (const route of ['/app.js', '/core.js', '/app.css', '/favicon.svg']) assert.equal((await fetch(base + route)).status, 200);
  for (const route of ['/package.json', '/.git/config', '/archive/website-service/site/index.html']) assert.equal((await fetch(base + route)).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await fetch(base + '/bad%ZZ')).status, 404);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  const head = await fetch(base + '/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
