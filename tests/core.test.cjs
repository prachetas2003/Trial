const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initialState, validateState, validatePack, styledPet, remainingTime, startSession, togglePause, tick, shipBuild, PETS } = require('../site/core.js');

test('new player has exactly one unlocked companion', () => {
  const state = initialState();
  assert.equal(state.selected, 'sprout');
  assert.deepEqual(PETS.filter(p => p.threshold <= state.shipped).map(p => p.id), ['sprout']);
});
test('blank titles get a useful default and long titles are capped', () => {
  assert.equal(startSession(initialState(), '   ', 20000, 1000).session.title, 'A little thing');
  assert.equal(startSession(initialState(), 'x'.repeat(200), 20000, 1000).session.title.length, 80);
});
test('a live build cannot be overwritten by a second start', () => {
  const state = startSession(initialState(), 'first', 20000, 1000);
  assert.throws(() => startSession(state, 'second', 20000, 1001));
  assert.equal(state.session.title, 'first');
});
test('session duration rejects invalid or unbounded values', () => {
  for (const duration of [0, -1, NaN, Infinity, 1500001]) assert.throws(() => startSession(initialState(), 'test', duration, 1000));
});
test('pause freezes the timer and resume preserves remaining time', () => {
  let state = startSession(initialState(), 'test', 20000, 1000);
  state = togglePause(state, 6000);
  assert.equal(state.session.status, 'paused');
  assert.equal(remainingTime(state.session, 900000), 15000);
  state = togglePause(state, 1000000);
  assert.equal(state.session.endAt, 1015000);
  assert.equal(remainingTime(state.session, 1005000), 10000);
});
test('elapsed wall-clock time survives tab sleep and never goes negative', () => {
  const state = startSession(initialState(), 'test', 20000, 1000);
  const updated = tick(state, 900000);
  assert.equal(updated.session.status, 'ready');
  assert.equal(remainingTime(updated.session, 900000), 0);
  assert.equal(updated.shipped, 0);
});
test('paused sessions do not expire when the background tab sleeps', () => {
  const state = togglePause(startSession(initialState(), 'test', 20000, 1000), 6000);
  assert.equal(tick(state, 900000), state);
});
test('shipping logs exactly one build and repeat actions do not mint rewards', () => {
  const state = startSession(initialState(), 'My first app', 20000, 1000);
  const shipped = shipBuild(state, 3000);
  assert.equal(shipped.shipped, 1);
  assert.equal(shipped.session, null);
  assert.deepEqual(shipped.builds, [{ title: 'My first app', at: 3000 }]);
  assert.equal(shipBuild(shipped, 3001), shipped);
});
test('first and third shipped builds unlock the intended companions', () => {
  let state = initialState();
  for (let i = 1; i <= 3; i++) {
    state = shipBuild(startSession(state, 'test', 20000, i * 1000), i * 1000 + 200);
    assert.deepEqual(PETS.filter(p => p.threshold <= state.shipped).map(p => p.id), i < 3 ? ['sprout', 'ember'] : ['sprout', 'ember', 'orbit']);
  }
});
test('history is capped without losing the lifetime shipped count', () => {
  let state = initialState();
  for (let i = 0; i < 35; i++) state = shipBuild(startSession(state, `build ${i}`, 1000, i * 2000), i * 2000 + 1000);
  assert.equal(state.shipped, 35);
  assert.equal(state.builds.length, 30);
  assert.equal(state.builds[0].title, 'build 34');
  assert.deepEqual(validateState(state), state);
});
test('valid backups round-trip including paused sessions', () => {
  const state = togglePause(startSession(initialState(), 'test', 20000, 1000), 6000);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))), state);
});
test('unearned companions and inconsistent count cannot be restored', () => {
  assert.throws(() => validateState({ ...initialState(), selected: 'orbit' }));
  assert.throws(() => validateState({ ...initialState(), builds: [{ title: 'phantom', at: 1000 }] }));
});
test('invalid backups and corrupt timestamps are rejected', () => {
  for (const value of [null, {}, [], { ...initialState(), shipped: -1 }, { ...initialState(), shipped: 1.5 }, { ...initialState(), shipped: 1, builds: [{ title: 'test', at: Infinity }] }]) assert.throws(() => validateState(value));
  assert.throws(() => validateState({ ...initialState(), session: { title: 'test', duration: 1000, endAt: 2000, remaining: 2000, status: 'paused' } }));
});

function samplePack() {
  return { format: 'buildlings-colours-v1', name: 'Test colours', palettes: Object.fromEntries(PETS.map(p => [p.id, { color: '#bbccdd', dark: '#8899aa', blush: '#eeaa99' }])) };
}
test('valid colour pack changes appearance without changing unlocks', () => {
  const pack = validatePack(samplePack());
  const pet = styledPet(PETS[0], pack);
  assert.equal(pet.color, '#bbccdd');
  assert.equal(pet.threshold, 0);
  assert.equal(pet.id, 'sprout');
  assert.equal(PETS[0].color, '#d4e789');
});
test('packs cannot inject SVG or omit a pet palette', () => {
  const bad = samplePack(); bad.palettes.sprout.color = '"><script>alert(1)</script>';
  assert.throws(() => validatePack(bad));
  const missing = samplePack(); delete missing.palettes.orbit;
  assert.throws(() => validatePack(missing));
});
test('backups preserve cosmetic packs and old version-1 backups still load', () => {
  const state = { ...initialState(), pack: validatePack(samplePack()) };
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(state))), state);
  const old = initialState(); delete old.pack;
  assert.equal(validateState(old).pack, null);
});
