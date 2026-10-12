const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CompanionMotion, safeArea, hitsPet, WINDOW, spring } = require('../desktop/motion.js');
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
  const prepare = motion.advance(80, { x: 0, y: 0 });
  assert.equal(prepare.hop, 0); assert.ok(prepare.scaleY < 1);
  assert.ok(motion.advance(350, { x: 0, y: 0 }).hop > 30);
  const landing = motion.advance(850, { x: 0, y: 0 });
  assert.equal(landing.hop, 0); assert.equal(landing.jumpPhase, 'landing');
  assert.ok(landing.scaleX > 1); assert.ok(landing.scaleY < 1);
  assert.equal(motion.advance(1200, { x: 0, y: 0 }).jumpPhase, 'ground');
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
  assert.equal(WINDOW.width, 320);
});
test('all companions include volume shading and separately animated layers', () => {
  for (const pet of PETS) {
    const svg = volumePetSVG(pet);
    for (const text of ['radialGradient', 'class="face"', 'class="paw-left"', 'class="ear-left"', 'happy-eyes']) assert.ok(svg.includes(text));
  }
});

test('locomotion follows equivalent trajectories at 30, 60, 120, and 144 Hz', () => {
  function simulate(hz) {
    const m = make(); m.hopsEnabled = false; m.chaseEnabled = false;
    let frame; for (let i = 0; i <= hz * 10; i++) frame = m.advance(i * 1000 / hz, { x: 0, y: 0 });
    return frame;
  }
  const reference = simulate(120);
  for (const hz of [30, 60, 144]) {
    const frame = simulate(hz);
    assert.ok(Math.hypot(frame.x - reference.x, frame.y - reference.y) < 1.5, `trajectory at ${hz} Hz`);
    assert.ok(Math.abs(frame.walkPhase - reference.walkPhase) < .2);
  }
});
test('spring timing does not depend on refresh rate and preserves velocity on retargeting', () => {
  const values = [60, 144].map(hz => { const s = { value: 0, velocity: 0 }; for (let i = 0; i < hz; i++) spring(s, 1, 9, 1 / hz); return s.value; });
  assert.ok(Math.abs(values[0] - values[1]) < 1e-10);
  const s = { value: 0, velocity: 0 }; spring(s, 1, 9, .1); const velocity = s.velocity;
  spring(s, -.5, 9, 1 / 1000); assert.ok(Math.abs(s.velocity - velocity) < .2);
});
test('steering changes velocity gradually and keeps fractional render positions', () => {
  const m = make(); m.hopsEnabled = false; m.followCursor({ x: 1100, y: 450 }, 0);
  let last = { vx: 0, vy: 0 }, fractional = false;
  for (let t = 0; t <= 1000; t += 1000 / 120) {
    const f = m.advance(t, { x: 1100, y: 450 });
    assert.ok(Math.hypot(f.vx - last.vx, f.vy - last.vy) <= 4);
    fractional ||= f.windowX !== Math.round(f.windowX); last = f;
  }
  assert.equal(fractional, true);
});
test('wander paths curve and the gait advances with travelled distance', () => {
  const m = make(() => .65); m.hopsEnabled = false; m.chooseBehavior(0, { x: 0, y: 0 });
  assert.ok(m.wanderPath); const p = m.wanderPath.points;
  assert.ok(Math.abs((p[1].x - p[0].x) * (p[3].y - p[0].y) - (p[1].y - p[0].y) * (p[3].x - p[0].x)) > 1);
  const before = m.walkPhase;
  for (let t = 0; t < 1500; t += 16) m.advance(t, { x: 0, y: 0 });
  assert.ok(m.walkPhase > before); const phase = m.walkPhase;
  m.pause(true, 1500); m.advance(1516, { x: 0, y: 0 }); assert.equal(m.walkPhase, phase);
});
test('reach gesture rises smoothly, holds, and returns to a settled pose', () => {
  const m = make(); m.reach(0);
  const opening = m.advance(200, { x: 0, y: 0 }); assert.equal(opening.mode, 'reach'); assert.ok(opening.reach > 0 && opening.reach < 1);
  assert.equal(m.advance(1000, { x: 0, y: 0 }).reach, 1);
  assert.ok(m.advance(1800, { x: 0, y: 0 }).reach < 1);
  assert.equal(m.advance(2200, { x: 0, y: 0 }).reach, 0);
});
test('petting blends into the happy pose and interrupts a reaching gesture', () => {
  const m = make(); m.reach(0);
  m.advance(50, { x: m.x - 20, y: m.y - 94 });
  const f = m.advance(100, { x: m.x + 20, y: m.y - 94 });
  assert.equal(f.mode, 'pet'); assert.equal(m.reachStart, null);
  assert.ok(f.petWeight > 0 && f.petWeight < 1);
  assert.equal(f.reach, 0);
});
test('jump cannot interrupt a reach and a paused pet can still say hello', () => {
  const m = make(); m.pause(true, 0); m.reach(0); m.jump(50);
  assert.equal(m.hopStart, null);
  assert.ok(m.advance(1000, { x: 0, y: 0 }).reach > .9);
});

test('edge-peeking glides to the screen edge and returns without a position jump', () => {
  const m = make(); const cursor = { x: 10, y: 10 }, before = m.x;
  m.setPresence('peek', 0); assert.equal(m.x, before);
  let f;
  for (let t = 0; t <= 10000; t += 16) f = m.advance(t, cursor);
  assert.ok(Math.abs(f.x - 1422) < 4); assert.equal(f.mode, 'peek'); assert.equal(f.hop, 0);
  const edge = m.x; m.setPresence('wander', 10000); assert.equal(m.x, edge);
  for (let t = 10016; t < 14000; t += 16) f = m.advance(t, cursor);
  assert.ok(f.x <= safeArea(areas[0]).right + 3);
});
test('drag tracks the grab point, animates physical swing, and settles after release', () => {
  const m = make(); m.pause(true, 0); const cursor = { x: m.x, y: m.y - 100 }; m.beginDrag(cursor, 0);
  let f;
  for (let t = 16; t <= 480; t += 16) { m.dragTo({ x: cursor.x + t * .5, y: cursor.y - t * .1 }); f = m.advance(t, cursor); }
  assert.equal(f.mode, 'drag'); assert.ok(Math.abs(m.x - cursor.x - 240) < 1); assert.ok(Math.abs(m.y - cursor.y - 100 + 48) < 1);
  assert.ok(f.dragWeight > .9); assert.ok(Math.abs(f.legSwing) > .1); assert.ok(Math.abs(f.bodySwing) > .04); assert.equal(f.sparkleId, 0);
  m.endDrag(480); const release = m.x;
  for (let t = 496; t < 4000; t += 16) f = m.advance(t, { x: 0, y: 0 });
  assert.ok(Math.abs(m.x - release) < 15); assert.ok(f.dragWeight < .001); assert.ok(Math.abs(f.legSwing) < .003); assert.ok(Math.abs(f.bodySwing) < .003);
});
test('peek dragging follows all four margins and retrieval glides back into safe bounds', () => {
  const m = make(), a = areas[0]; m.setPresence('peek', 0);
  for (let t = 0; t < 10000; t += 16) m.advance(t, { x: 0, y: 0 });
  m.beginDrag({ x: m.x - 15, y: m.y - 100 }, 10000);
  let t = 10000;
  for (const [edge, cursor] of [['left', { x: 4, y: 550 }], ['top', { x: 700, y: 4 }], ['bottom', { x: 800, y: 896 }], ['right', { x: 1436, y: 400 }]]) {
    m.dragTo(cursor); t += 32; m.advance(t, cursor); assert.equal(m.edge, edge);
    assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y));
    if (edge === 'left') assert.equal(m.x, a.x + 18); if (edge === 'right') assert.equal(m.x, a.width - 18);
  }
  m.endDrag(t); const held = m.x; m.setPresence('wander', t); assert.equal(m.x, held);
  const b = safeArea(a);
  for (let end = t + 8000; t < end; t += 16) m.advance(t, { x: 10, y: 10 });
  assert.ok(m.x >= b.left && m.x <= b.right + 2); assert.ok(m.y >= b.top && m.y <= b.bottom + 2);
});
test('continuous chase remains enabled after the occasional chase timeout and stops when toggled', () => {
  const m = make(); m.hopsEnabled = false; m.setChasing(true, 0);
  for (let t = 0; t <= 12000; t += 16) { const f = m.advance(t, { x: 1150, y: 400 }); if (t > 5000) assert.equal(f.mode, 'chase'); }
  const x = m.x; for (let t = 12016; t < 14000; t += 16) m.advance(t, { x: 300, y: 400 }); assert.ok(m.x < x - 80);
  m.setChasing(false, 14000); assert.equal(m.chaseLocked, false); const f = m.advance(14016, { x: 300, y: 400 }); assert.notEqual(f.mode, 'chase');
});

test('smaller monkey keeps its foot anchor, scaled hit region, drag point and edge placement', () => {
  const m = make(), anchor = {x:m.x,y:m.y}; m.setScale(.6);
  assert.equal(m.x,anchor.x); assert.equal(m.y,anchor.y);
  assert.equal(hitsPet({x:m.x,y:m.y-94*.6},m.x,m.y,0,.6),true);
  assert.equal(hitsPet({x:m.x+60,y:m.y-94*.6},m.x,m.y,0,.6),false);
  m.beginDrag({x:m.x,y:m.y-94*.6},0); m.dragTo({x:m.x+80,y:m.y-94*.6+30}); m.advance(100,{x:0,y:0});
  assert.ok(Math.abs(m.x-anchor.x-80)<1); assert.ok(Math.abs(m.y-anchor.y-30)<1); m.endDrag(110);
  m.setPresence('peek',120); m.setEdge('top',.5); assert.equal(m.peekTarget().y,154*.6);
  m.setEdge('bottom',.5); assert.equal(m.peekTarget().y,900+118*.6);
});
test('returning to the edge continues while the cursor overlaps or strokes the monkey',()=>{
 const m=make();m.pause(true,0);m.setPresence('peek',0);
 let f;for(let t=0;t<10000;t+=1000/60){f=m.advance(t,{x:m.x,y:m.y-94});}
 assert.equal(m.presence,'peek');const target=m.peekTarget();assert.ok(Math.hypot(f.x-target.x,f.y-target.y)<4);
});
