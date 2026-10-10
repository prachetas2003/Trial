import { SproutScene } from './sprout3d.js';
const { CompanionMotion, WINDOW } = window.BuildlingsMotion;
const host = document.querySelector('#companion-host');
let motion, cursor = { x: 0, y: 0 }, selected = '', scene, lastReport = 0, enabled = true;
let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function selectPet(id) {
  if (selected === id) return;
  selected = id;
  const data = window.Buildlings.PETS.find(p => p.id === id) || window.Buildlings.PETS[0];
  host.setAttribute('aria-label', `${data.name}, your 3D desktop companion`);
  if (scene) scene.setPet(data);
  else {
    try { scene = new SproutScene(host, data); }
    catch (error) {
      console.error('3D renderer unavailable:', error.message);
      window.__buildlingsRenderer = { type: 'unavailable', error: error.message };
      host.innerHTML = window.BuildlingsArt.volumePetSVG(data);
      window.companion.report?.({ error: '3D graphics unavailable. Check graphics acceleration and your display driver.' });
      document.querySelector('#graphics-status')?.replaceChildren(document.createTextNode('3D graphics are unavailable in this browser. Try a browser with WebGL 2 support.'));
    }
  }
}
function onInput(input) {
  if (input.cursor) cursor = { ...input.cursor };
  if (input.areas) {
    if (!motion) {
      motion = new CompanionMotion({ areas: input.areas, activeId: input.activeId, now: performance.now() });
      window.__buildlingsEngine = motion;
    } else motion.setAreas(input.areas);
  }
  if (!motion) return;
  if (input.settings) {
    selectPet(input.settings.pet || 'sprout');
    motion.chaseEnabled = input.settings.chasing !== false;
    motion.hopsEnabled = input.settings.hopping !== false && !reduceMotion;
    if (!motion.hopsEnabled) motion.hopStart = null;
    if (!motion.chaseEnabled && motion.mode === 'chase') { motion.mode = 'idle'; motion.target = { x: motion.x, y: motion.y }; }
  }
  if (typeof input.paused === 'boolean' && input.paused !== motion.paused) motion.pause(input.paused, performance.now());
  if (typeof input.visible === 'boolean') enabled = input.visible;
  if (input.action === 'call') { motion.pause(false, performance.now()); motion.pettedUntil = 0; motion.followCursor(cursor, performance.now()); }
  if (input.action === 'reach') motion.reach(performance.now());
  if (input.action === 'jump') { motion.pause(false, performance.now()); motion.jump(performance.now()); }
  if (input.action === 'resume') { motion.lastTime = performance.now(); motion.accumulator = 0; }
}
window.companion.onInput(onInput);
// Forwarded Windows pointer events supplement native cursor polling, with no clicks captured.
window.addEventListener('pointermove', event => {
  if (window.companion.native && motion) { const area = motion.area(); cursor = { x: area.x + event.clientX, y: area.y + event.clientY }; }
});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
  reduceMotion = event.matches; if (motion && reduceMotion) { motion.hopsEnabled = false; motion.hopStart = null; }
});
function frame(now) {
  if (motion && enabled) {
    const next = motion.advance(now, cursor), area = motion.area();
    host.style.transform = `translate3d(${next.x - area.x - (scene?.footX ?? WINDOW.footX)}px,${next.y - area.y - (scene?.footY ?? WINDOW.footY)}px,0)`;
    scene?.draw(next, now);
    document.body.dataset.mood = next.mode;
    window.__buildlingsFrame = { ...next, pet: selected };
    window.dispatchEvent(new CustomEvent('companion-frame', { detail: window.__buildlingsFrame }));
    if (now - lastReport > 200 || window.__reportedArea !== next.areaId) {
      window.__reportedArea = next.areaId; lastReport = now;
      window.companion.report?.({ x: next.x, y: next.y, mode: next.mode, hop: next.hop, sparkleId: next.sparkleId, areaId: next.areaId, renderer: window.__buildlingsRenderer?.type });
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.companion.ready();
