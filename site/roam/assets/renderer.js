import { MonkeyScene } from './monkey.js?v=0.9.0';
import { SpeechBubble } from './bubbles.js?v=0.9.0';
import { Celebrations } from './celebrations.js?v=0.9.0';
import { OverlayBar } from './hud.js?v=0.9.0';
const hud = new OverlayBar(window.companion);
const { CompanionMotion, WINDOW } = window.BuildlingsMotion;
const host = document.querySelector('#companion-host');
let motion, cursor = { x: 0, y: 0 }, selected = '', scene, lastReport = 0, enabled = true, grabZone, quotesEnabled = true, dragEnabled = true, heldPointer = null, lastInteractive = false, scale = 1;
let lastPaint = 0, lastFrameTime = 0, frameFailures = 0, compatibility = false;
let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bubble = new SpeechBubble(), celebrations = new Celebrations();
function selectPet() {
  if (scene) return;
  selected = 'monkey';
  host.setAttribute('aria-label', 'Mischief, your marker-doodle monkey');
  try { scene = new MonkeyScene(host);
    grabZone = document.createElement('div'); grabZone.id = 'pet-grab-zone'; grabZone.setAttribute('aria-label', 'Drag Mischief'); host.append(grabZone);
    grabZone.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !dragEnabled || !motion) return;
      event.preventDefault(); heldPointer = event.pointerId; grabZone.setPointerCapture(event.pointerId);
      const area = motion.area(); cursor = { x: area.x + event.clientX, y: area.y + event.clientY };
      motion.beginDrag(cursor, performance.now()); grabZone.dataset.held = 'true'; window.companion.setDragging?.(true);
    });
    grabZone.addEventListener('contextmenu', event => { event.preventDefault(); window.companion.openFocus('appearance'); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grabZone.addEventListener(type, stopDrag);
  }
  catch (error) {
    console.error('Doodle renderer unavailable:', error.message);
    window.__buildlingsRenderer = { type: 'unavailable', error: error.message };
    window.companion.report?.({ error: 'Doodle drawing surface unavailable.' });
    document.querySelector('#graphics-status')?.replaceChildren(document.createTextNode('The doodle drawing surface is unavailable in this browser.'));
  }
}
function onInput(input) {
  if (typeof input.safeMode === 'boolean') { compatibility=input.safeMode; window.__mischiefSafeMode=compatibility; }
  if (input.cursor) cursor = { ...input.cursor };
  if (input.areas) {
    if (!motion) {
      motion = new CompanionMotion({ areas: input.areas, activeId: input.activeId, now: performance.now() });
      window.__buildlingsEngine = motion;
    } else motion.setAreas(input.areas);
  }
  if (!motion) return;
  if (input.settings) {
    selectPet();
    scene?.setInk(input.settings.ink);
    if ('chasing' in input.settings) motion.chaseEnabled = input.settings.chasing !== false;
    if ('hopping' in input.settings) motion.hopsEnabled = input.settings.hopping !== false && !reduceMotion;
    if (!motion.hopsEnabled) motion.hopStart = null;
    if (!motion.chaseEnabled && !motion.chaseLocked && motion.mode === 'chase') { motion.mode = 'idle'; motion.target = { x: motion.x, y: motion.y }; }
  }
  if (typeof input.paused === 'boolean' && input.paused !== motion.paused) motion.pause(input.paused, performance.now());
  if (typeof input.visible === 'boolean') enabled = input.visible;
  host.style.visibility = enabled ? 'visible' : 'hidden';
  if (input.presence) motion.setPresence(input.presence === 'peek' ? 'peek' : 'wander', performance.now());
  if (typeof input.safeMode === 'boolean') compatibility = input.safeMode;
  if (input.preferences) {
    scale = input.preferences.monkeyScale || 1; motion.setScale(scale); bubble.setScale(scale); celebrations.configure(input.preferences);
    quotesEnabled = input.preferences.quotesEnabled !== false;
    if (!quotesEnabled) { bubble.quote = null; bubble.element.hidden = true; }
    dragEnabled = input.preferences.dragEnabled !== false && !!scene; if (!dragEnabled) stopDrag();
    if (grabZone) grabZone.hidden = !dragEnabled;
    if (!motion.dragging) motion.setEdge(input.preferences.edge, input.preferences.edgePosition);
    motion.setChasing(input.preferences.chaseCursor === true, performance.now());
  }
  if (!enabled) stopDrag();
  if (input.completion) { hud.complete(input.completion); if(input.completion.completed && input.completion.kind==='focus') { celebrations.enqueue({id:input.completion.id+':complete',kind:'complete'},performance.now()); } }
  if(input.celebration)celebrations.enqueue(input.celebration,performance.now());
  if (input.quote && enabled && quotesEnabled) bubble.show(input.quote, performance.now());
  bubble.element.style.display = enabled && quotesEnabled ? '' : 'none';
  if (input.action === 'call') { motion.pause(false, performance.now()); motion.pettedUntil = 0; motion.followCursor(cursor, performance.now()); }
  if (input.action === 'reach') motion.reach(performance.now());
  if (input.action === 'ack') { motion.pettedUntil = performance.now() + 1500; motion.sparkleId++; motion.reachStart = null; motion.mode = 'pet'; }
  if (input.action === 'jump') { motion.pause(false, performance.now()); motion.jump(performance.now()); }
  if (input.action === 'resume') { motion.lastTime = performance.now(); motion.accumulator = 0; }
}
window.companion.onInput(onInput);
function stopDrag() {
  if (heldPointer === null) return;
  const id = heldPointer; heldPointer = null;
  const edge = motion?.endDrag(performance.now());
  grabZone.dataset.held = 'false';
  if (grabZone.hasPointerCapture(id)) grabZone.releasePointerCapture(id);
  window.companion.setDragging?.(false);
  if (motion?.presence === 'peek' && edge) window.companion.focusAction({ type: 'preferences', values: edge });
}
// Windows forwards pointer movement while transparent areas stay click-through.
window.addEventListener('pointermove', event => {
  if (window.companion.native && motion) { const area = motion.area(); cursor = { x: area.x + event.clientX, y: area.y + event.clientY }; }
});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
  reduceMotion = event.matches; if (motion && reduceMotion) { motion.hopsEnabled = false; motion.hopStart = null; }
});
function frame(now) {
  // Schedule first: a failed paint must not permanently stop hit testing/HUD reports.
  requestAnimationFrame(frame);
  if (lastFrameTime && now-lastFrameTime > 1000) window.companion.diagnostic?.({type:'frame-stall',duration:now-lastFrameTime});
  lastFrameTime=now;
  try {
  if (motion) {
    if (motion.dragging) motion.dragTo(cursor);
    const next = motion.advance(now, cursor), area = motion.area(), bar = hud.rectangle(area);
    host.style.transform = `translate3d(${next.x - area.x - (scene?.footX ?? WINDOW.footX)}px,${next.y - area.y - (scene?.footY ?? WINDOW.footY)}px,0) scale(${scale})`;
    host.style.transformOrigin = `${scene?.footX ?? WINDOW.footX}px ${scene?.footY ?? WINDOW.footY}px`;
    if (enabled && (!compatibility || now-lastPaint >= 1000/30)) {
      try { scene?.draw(next, now); lastPaint=now; }
      catch { scene=null; dragEnabled=false; if(grabZone)grabZone.hidden=true; window.companion.diagnostic?.({type:'renderer-error'}); hud.showMessage('The monkey drawing failed. The timer still works; restart the overlay from the tray.'); }
    }
    if (grabZone) grabZone.style.transform = `translateY(${-next.hop}px)`;
    if (window.companion.native) {
      const overBar = bar.width > 0 && cursor.x >= bar.x && cursor.x <= bar.x + bar.width && cursor.y >= bar.y && cursor.y <= bar.y + bar.height;
      const hot = motion.dragging || overBar || (enabled && dragEnabled && window.BuildlingsMotion.hitsPet(cursor, next.x, next.y, next.hop, scale));
      if (hot !== lastInteractive) { lastInteractive = hot; window.companion.setInteractive(hot); }
    }
    bubble.draw({ ...next, scale, x: next.x - area.x, y: next.y - area.y }, now, reduceMotion, bar.y - area.y + bar.height);
    if(celebrations.draw({...next,scale,x:next.x-area.x,y:next.y-area.y,returning:motion.returning},now,enabled,reduceMotion) && enabled)motion.reach(now);
    document.body.dataset.mood = next.mode;
    window.__buildlingsFrame = { ...next, scale, pet: selected };
    window.dispatchEvent(new CustomEvent('companion-frame', { detail: window.__buildlingsFrame }));
    if (now - lastReport > 33 || window.__reportedArea !== next.areaId) {
      window.__reportedArea = next.areaId; lastReport = now;
      window.companion.report?.({ x: next.x, y: next.y, mode: next.mode, hop: next.hop * scale, scale, sparkleId: next.sparkleId, areaId: next.areaId, renderer: window.__buildlingsRenderer?.type, hudRect: bar });
    }
  }
  } catch { if (frameFailures++ < 3) { window.companion.diagnostic?.({type:'renderer-error'}); hud.showMessage('The monkey drawing stopped. Restart desktop overlay from the tray.'); } }
}
requestAnimationFrame(frame);
window.companion.ready();
