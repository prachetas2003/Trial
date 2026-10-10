const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CompanionMotion, safeArea, hitsPet, WINDOW } = require('../desktop/motion.js');
const { volumePetSVG } = require('../desktop/art.js');
const windowOptions = require('../desktop/window-options.cjs');
const { PETS } = require('../site/core.js');
const areas = [{ id: 1, x: 0, y: 0, width: 1440, height: 900 }];
function make(random = () => .5) { return new CompanionMotion({ areas, random, now: 0 }); }
function seededRandom() { let seed = 12345; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

test('desktop is transparent, frameless, unfocusable, and has a sandboxed renderer', () => {
  const options = windowOptions(10, 20);
  assert.equal(options.transparent, true); assert.equal(options.frame, false);
  assert.equal(options.backgroundColor, '#00000000'); assert.equal(options.hasShadow, false);
  assert.equal(options.focusable, false); assert.equal(options.skipTaskbar, true);
  assert.equal(options.webPreferences.nodeIntegration, false); assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.contextIsolation, true);
});
test('pet wanders on its own without cursor movement', () => {
  const motion = make(); const x = motion.x, y = motion.y;
  for (let t = 0; t < 10000; t += 16) motion.advance(t, { x: 10, y: 10 });
  assert.ok(Math.hypot(motion.x - x, motion.y - y) > 30);
});
test('stationary cursor hovering the pet does not falsely count as stroking', () => {
  const motion = make(); const cursor = { x: motion.x, y: motion.y - 80 };
  for (let t = 0; t < 3000; t += 16) motion.advance(t, cursor);
  assert.equal(motion.sparkleId, 0);
});
test('moving the cursor across the body emits sparkles and a happy reaction', () => {
  const motion = make(); motion.advance(0, { x: motion.x - 25, y: motion.y - 80 });
  let frame;
  for (let t = 16; t <= 800; t += 16) frame = motion.advance(t, { x: motion.x + Math.sin(t / 60) * 25, y: motion.y - 80 });
  assert.ok(frame.sparkleId >= 2); assert.equal(frame.mode, 'pet');
  assert.equal(frame.vx, 0); assert.equal(frame.vy, 0);
});
test('chasing moves toward the cursor and can be disabled', () => {
  const motion = make(); const cursor = { x: 1000, y: 450 };
  motion.followCursor(cursor, 0);
  const before = Math.hypot(cursor.x - motion.x, cursor.y + 88 - motion.y);
  for (let t = 0; t < 1800; t += 16) motion.advance(t, cursor);
  assert.ok(Math.hypot(cursor.x - motion.x, cursor.y + 88 - motion.y) < before);
  const noChase = make(() => .95); noChase.chaseEnabled = false;
  for (let t = 0; t < 20000; t += 16) {
    const frame = noChase.advance(t, { x: 1100, y: 500 }); assert.notEqual(frame.mode, 'chase');
  }
});
test('random behaviour occasionally chooses chasing without user input', () => {
  const motion = make(() => .9); let chased = false;
  for (let t = 0; t < 12000; t += 16) if (motion.advance(t, { x: 1100, y: 500 }).mode === 'chase') chased = true;
  assert.equal(chased, true);
});
test('jump lifts off, lands, and applies landing squash', () => {
  const motion = make(); motion.jump(0);
  assert.ok(motion.advance(350, { x: 0, y: 0 }).hop > 30);
  assert.equal(motion.advance(1100, { x: 0, y: 0 }).hop, 0);
  const landing = motion.advance(1200, { x: 0, y: 0 });
  assert.ok(landing.scaleX > 1); assert.ok(landing.scaleY < 1);
});
test('paused companion stays still, but can still react to petting', () => {
  const motion = make(); motion.pause(true, 0); const x = motion.x, y = motion.y;
  for (let t = 0; t < 15000; t += 16) motion.advance(t, { x: 0, y: 0 });
  assert.equal(motion.x, x); assert.equal(motion.y, y); assert.equal(motion.hopStart, null);
  motion.advance(15001, { x: x - 20, y: y - 80 });
  const frame = motion.advance(15017, { x: x + 20, y: y - 80 });
  assert.equal(frame.mode, 'pet'); assert.equal(frame.sparkleId, 1);
});
test('cursor teleporting does not generate a petting reward', () => {
  const motion = make(); motion.advance(0, { x: 0, y: 0 });
  motion.advance(16, { x: motion.x, y: motion.y - 80 }); assert.equal(motion.sparkleId, 0);
});
test('position stays within display bounds during a long randomized session', () => {
  const motion = make(seededRandom()); const b = safeArea(areas[0]);
  for (let t = 0; t < 180000; t += 16) {
    const frame = motion.advance(t, { x: 1000 + Math.sin(t / 1500) * 400, y: 300 + Math.sin(t / 1800) * 280 });
    assert.ok(frame.x >= b.left && frame.x <= b.right);
    assert.ok(frame.y >= b.top && frame.y <= b.bottom);
    assert.ok(frame.hop >= 0 && frame.hop <= 68);
    assert.ok(Number.isFinite(frame.windowX) && Number.isFinite(frame.windowY));
  }
});
test('negative-origin monitors and a removed monitor are handled safely', () => {
  const left = { id: 2, x: -1920, y: -200, width: 1920, height: 1080 };
  const motion = new CompanionMotion({ areas: [...areas, left], activeId: 2, random: () => .5 });
  assert.ok(motion.x < 0);
  motion.followCursor({ x: 1000, y: 500 }, 0); assert.equal(motion.areaId, 1);
  motion.setAreas([left]); assert.equal(motion.areaId, 2);
  const b = safeArea(left); assert.ok(motion.x >= b.left && motion.x <= b.right);
});
test('a long system sleep cannot teleport the pet', () => {
  const motion = make(); motion.chooseBehavior(0, { x: 0, y: 0 }); const x = motion.x, y = motion.y;
  motion.advance(3600000, { x: 0, y: 0 });
  assert.ok(Math.hypot(motion.x - x, motion.y - y) < 10);
});
test('pet hit region follows jumps, and small displays have valid safe bounds', () => {
  assert.equal(hitsPet({ x: 100, y: 100 }, 100, 230, 50), true);
  assert.equal(hitsPet({ x: 250, y: 100 }, 100, 230, 50), false);
  const b = safeArea({ x: 0, y: 0, width: 200, height: 200 });
  assert.ok(b.left <= b.right && b.top <= b.bottom);
  assert.equal(WINDOW.width, 260);
});
test('all companions include volume shading and separately animated layers', () => {
  for (const pet of PETS) {
    const svg = volumePetSVG(pet);
    for (const text of ['radialGradient', 'class="face"', 'class="paw-left"', 'class="ear-left"', 'happy-eyes']) assert.ok(svg.includes(text));
  }
});
