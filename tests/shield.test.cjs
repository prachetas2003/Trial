const test = require('node:test'), assert = require('node:assert/strict'), { once } = require('node:events');
const policy = require('../desktop/shield-policy.js');
const { FocusCompanion } = require('../desktop/focus.js');
const bank = require('../desktop/quotes.js');
const { createShieldBridge } = require('../desktop/shield-bridge.cjs');
const tab = 'browser_123:5';
test('website rules match host boundaries and feature paths, without blocking regular YouTube', () => {
  const state = { active: true, shield: { websites: ['reddit.com'], features: { shorts: true, reels: true } } };
  for (const url of ['https://reddit.com/', 'https://old.reddit.com/foo', 'https://youtube.com/shorts/123', 'https://www.instagram.com/reel/123/']) assert.ok(policy.reason(url, tab, state), url);
  for (const url of ['https://notreddit.com/', 'https://reddit.com.evil.com/', 'https://youtube.com/watch?v=x', 'https://youtube.com/shortstop', 'https://instagram.com/direct/']) assert.equal(policy.reason(url, tab, state), '', url);
  assert.equal(policy.reason('https://reddit.com/', tab, { ...state, active: false }), '');
});
test('work tab permission still enforces website blocks; explicit locks work independently', () => {
  const state = { active: true, shield: { onlyWorkTabs: true, workTabs: [tab], websites: ['reddit.com'] } };
  assert.equal(policy.reason('https://work.com/', tab, state), '');
  assert.ok(policy.reason('https://reddit.com/', tab, state));
  assert.ok(policy.reason('https://work.com/', 'browser_123:6', state));
  assert.ok(policy.reason('https://work.com/', tab, { active: true, shield: { lockedTabs: [tab] } }));
});
test('invalid website rules and corrupt saved settings cannot broaden a restriction', () => {
  for (const value of ['javascript:alert(1)', '*', 'https://reddit.com/path', 'https://user:pass@reddit.com', 'localhost:43827', 'https://reddit.com?x=y']) assert.equal(policy.domain(value), null, value);
  assert.equal(policy.domain('https://www.REDDIT.com/'), 'reddit.com');
  assert.deepEqual(policy.settings(null), policy.settings());
  assert.deepEqual(policy.settings({ websites: ['*','reddit.com','reddit.com'], workTabs: ['oops', tab, tab] }).websites, ['reddit.com']);
});
test('presets apply atomically, independent changes persist, and silent monkey suppresses every quote source', () => {
  const f = new FocusCompanion({ bank, now: 100 });
  f.dispatch({ type: 'shield', values: { websites: ['reddit.com'], workTabs: [tab] } }, 100);
  f.dispatch({ type: 'preset', name: 'blocker' }, 100);
  assert.equal(f.presence(), 'hidden');
  for (const key of ['quotesEnabled','showHud','vignette','completionSound','chaseCursor']) assert.equal(f.preferences[key], false);
  assert.equal(f.preferences.shield.enabled, true); assert.deepEqual(f.preferences.shield.websites, ['reddit.com']);
  f.dispatch({ type: 'preferences', values: { presence: 'peek', returnAfterSession: false } }, 100);
  f.dispatch({ type: 'start' }, 100); f.drainEvents();
  f.dispatch({ type: 'stay' }, 3000); f.dispatch({ type: 'quote', category: 'hard' }, 3000); f.dispatch({ type: 'end' }, 4000);
  assert.equal(f.drainEvents().some(e => e.type === 'quote'), false);
  const restored = new FocusCompanion({ bank, saved: f.export(4000), now: 5000 });
  assert.equal(restored.preferences.quotesEnabled, false); assert.equal(restored.preferences.presence, 'peek');
  restored.dispatch({ type: 'preset', name: 'companion' }, 6000);
  assert.equal(restored.preferences.shield.enabled, false); assert.deepEqual(restored.preferences.shield.websites, ['reddit.com']);
});
test('local bridge authenticates browser origins, exposes a running-session lease, and releases on pause', async () => {
  const token = 'a'.repeat(43), f = new FocusCompanion({ bank, now: Date.now() });
  f.dispatch({ type: 'shield', values: { enabled: true } }); f.dispatch({ type: 'start' });
  const bridge = createShieldBridge({ token, port: 0, getState: () => f.snapshot(), action: a => f.dispatch(a) });
  await once(bridge.server, 'listening');
  const url = `http://127.0.0.1:${bridge.server.address().port}/sync`;
  const request = (headers, values = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json', ...headers }, body: JSON.stringify({ clientId: 'browser_123', tabs: [{ id: 5, title:'Work', url:'https://work.com/' }], ...values }) });
  const origin = 'chrome-extension://' + 'a'.repeat(32);
  try {
    assert.equal((await request({ Origin:'https://evil.com', 'X-Mischief-Key':token })).status, 403);
    assert.equal((await request({ Origin:origin })).status, 401);
    const noOrigin = await request({ 'X-Mischief-Key':token }, { clientId:'originless_browser' });
    assert.equal(noOrigin.status, 200, 'permission-granted extension fetches may omit Origin; the secret and loopback host are still required');
    const valid = { Origin:origin, 'X-Mischief-Key':token };
    assert.equal((await (await request(valid)).json()).active, true); assert.equal(bridge.info().connected, true);
    assert.ok(bridge.info().tabs.some(t => t.key === tab));
    await request(valid, { action:'end' }); assert.ok(f.session, 'browser cannot finish or reconfigure a session');
    assert.equal((await (await request(valid, { action:'pause' })).json()).active, false);
    assert.equal((await request({ ...valid, Origin:'chrome-extension://'+'b'.repeat(32) })).status, 400);
    await request(valid, { action:'save', url:'https://work.com/later' }); assert.equal(f.notes[0].text, 'For later: https://work.com/later');
  } finally { bridge.close(); }
});
