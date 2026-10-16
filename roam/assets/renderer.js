import { MonkeyScene } from './monkey.js?v=0.11.0';
import { SpeechBubble } from './bubbles.js?v=0.11.0';
import { Celebrations } from './celebrations.js?v=0.11.0';
import { OverlayBar } from './hud.js?v=0.11.0';
const native=window.companion.native;
const hud = native?null:new OverlayBar(window.companion);
const play=new window.MischiefPlay.PlayPhysics();
let tailZone,pressStart,pendingComplete=0;
const { CompanionMotion, WINDOW } = window.BuildlingsMotion;
const host = document.querySelector('#companion-host');
let motion, cursor = { x: 0, y: 0 }, selected = '', scene, enabled = true, grabZone, quotesEnabled = true, dragEnabled = true, heldPointer = null, lastInteractive = false, scale = 1;
let lastFrameTime = 0, frameFailures = 0, compatibility = false;
const paintClock=new window.MischiefFrames.FrameClock(60),safePaintClock=new window.MischiefFrames.FrameClock(30),reportClock=new window.MischiefFrames.FrameClock(native?60:30);
let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bubble = native?null:new SpeechBubble(), celebrations = native?null:new Celebrations();
function selectPet() {
  if (scene) return;
  selected = 'monkey';
  host.setAttribute('aria-label', 'Mischief, your marker-doodle monkey');
  try { scene = new MonkeyScene(host);
    grabZone = document.createElement('div'); grabZone.id = 'pet-grab-zone'; grabZone.setAttribute('aria-label', 'Drag Mischief'); host.append(grabZone);
    tailZone=document.createElement('div');tailZone.id='tail-grab-zone';tailZone.setAttribute('aria-label','Pull the springy tail');host.append(tailZone);
    for(const zone of [grabZone,tailZone]){
      zone.addEventListener('pointerdown',event=>{
        if(event.button!==0||!dragEnabled||!motion)return;
        event.preventDefault();heldPointer=event.pointerId;grabZone.setPointerCapture(event.pointerId);
        cursor=point(event);pressStart={...cursor};const now=performance.now();
        const head=cursor.y<motion.y-(130+(motion.pose(now).hop||0))*scale;
        const kind=play.enabled?(zone===tailZone?'tail':head?'dangle':'squish'):'dangle';play.press(kind,cursor,now);
        if(kind==='dangle')motion.beginDrag(cursor,now);else{motion.vx=motion.vy=0;motion.playHeld=true;}
        grabZone.dataset.held='true';window.companion.setDragging?.(true);
      });
      zone.addEventListener('contextmenu',e=>{e.preventDefault();window.companion.openFocus('monkey');});
    }
    for(const type of ['pointerup','pointercancel','lostpointercapture'])grabZone.addEventListener(type,e=>stopDrag(e.type!=='pointerup'));
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
    scale = input.preferences.monkeyScale || 1; motion.setScale(scale); bubble?.setScale(scale); celebrations?.configure(input.preferences);play.enabled=input.preferences.playEnabled!==false;
    quotesEnabled = input.preferences.quotesEnabled !== false;
    if (!quotesEnabled) { if(bubble){bubble.quote = null; bubble.element.hidden = true;} }
    dragEnabled = input.preferences.dragEnabled !== false && !!scene; if (!dragEnabled) stopDrag();
    if (grabZone) grabZone.hidden = !dragEnabled;if(tailZone)tailZone.hidden=!dragEnabled||!play.enabled;
    if (!motion.dragging) motion.setEdge(input.preferences.edge, input.preferences.edgePosition);
    motion.setChasing(input.preferences.chaseCursor === true, performance.now());
  }
  if (!enabled) stopDrag();
  if (input.completion) { hud?.complete(input.completion);if(native&&input.completion.completed&&input.completion.kind==='focus')pendingComplete=performance.now(); if(input.completion.completed && input.completion.kind==='focus') { celebrations?.enqueue({id:input.completion.id+':complete',kind:'complete'},performance.now()); } }
  if(input.celebration)celebrations?.enqueue(input.celebration,performance.now());
  if (input.quote && enabled && quotesEnabled) bubble?.show(input.quote, performance.now());
  if(bubble)bubble.element.style.display = enabled && quotesEnabled ? '' : 'none';
  if (input.action === 'call') { motion.pause(false, performance.now()); motion.pettedUntil = 0; motion.followCursor(cursor, performance.now()); }
  if (input.action === 'reach') motion.reach(performance.now());
  if (input.action === 'ack') { motion.pettedUntil = performance.now() + 1500; motion.sparkleId++; motion.reachStart = null; motion.mode = 'pet'; }
  if (input.action === 'jump') { motion.pause(false, performance.now()); motion.jump(performance.now()); }
  if(input.playDemo&&play.enabled){const now=performance.now();play.press(input.playDemo,{x:motion.x,y:motion.y},now);if(input.playDemo==='tail')play.move({x:motion.x+40,y:motion.y-20},now+10);setTimeout(()=>play.release(),450);}
  if (input.action === 'resume') { motion.lastTime = performance.now(); motion.accumulator = 0; }
}
window.companion.onInput(onInput);
function point(event){const area=motion.area();return native?{x:event.screenX,y:event.screenY}:{x:area.x+event.clientX,y:area.y+event.clientY};}
function stopDrag(cancel=false){
 if(heldPointer===null)return;const id=heldPointer;heldPointer=null;
 motion.playHeld=false;motion.actionUntil=performance.now()+1200;
 const velocity=play.velocity(performance.now());
 const edge=motion?.endDrag(performance.now(),{toss:play.enabled&&!reduceMotion&&!cancel,velocity});play.release();
 grabZone.dataset.held='false';if(grabZone.hasPointerCapture(id))grabZone.releasePointerCapture(id);
 window.companion.setDragging?.(false);
 if(motion?.presence==='peek'&&edge)window.companion.focusAction({type:'preferences',values:edge});
}
window.addEventListener('pointermove',event=>{if(!motion)return;cursor=point(event);if(heldPointer!==null){const now=performance.now();play.move(cursor,now);if(play.kind==='squish'&&Math.hypot(cursor.x-pressStart.x,cursor.y-pressStart.y)>8){play.kind='dangle';motion.beginDrag(pressStart,now);}if(motion.dragging)motion.dragTo(cursor);}});
window.addEventListener('blur',()=>stopDrag(true));
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
    const next = motion.advance(now, cursor), area = motion.area(), bar = hud?.rectangle(area)||{x:0,y:0,width:0,height:0};
    Object.assign(next,play.advance(now,next.petWeight,scale,reduceMotion));
    if(pendingComplete&&!motion.returning&&now-pendingComplete>300){pendingComplete=0;motion.reach(now);}
    host.style.transform = `translate3d(${native?50:next.x-area.x-(scene?.footX??WINDOW.footX)}px,${native?14:next.y-area.y-(scene?.footY??WINDOW.footY)}px,0) scale(${scale})`;
    host.style.transformOrigin = `${scene?.footX ?? WINDOW.footX}px ${scene?.footY ?? WINDOW.footY}px`;
    if (enabled && (compatibility?safePaintClock:paintClock).due(now)) {
      try { scene?.draw(next, now); }
      catch { stopDrag(true);scene=null; dragEnabled=false;host.style.visibility='hidden';window.__buildlingsRenderer={type:'unavailable'}; if(grabZone)grabZone.hidden=true;if(tailZone)tailZone.hidden=true; window.companion.diagnostic?.({type:'renderer-error'}); hud?.showMessage('The monkey drawing failed. The timer still works; restart the overlay from the tray.'); }
    }
    if(tailZone){tailZone.style.transform=`translateY(${-next.hop}px)`;tailZone.style.left=next.edge==='left'&&next.mode==='peek'?'30px':'224px';}
    if (grabZone) grabZone.style.transform = `translateY(${-next.hop}px)`;
    if (window.companion.native) {
      const overBar = bar.width > 0 && cursor.x >= bar.x && cursor.x <= bar.x + bar.width && cursor.y >= bar.y && cursor.y <= bar.y + bar.height;
      const hot = motion.dragging || overBar || (enabled && dragEnabled && window.BuildlingsMotion.hitsPet(cursor, next.x, next.y, next.hop, scale));
      if (hot !== lastInteractive) { lastInteractive = hot; window.companion.setInteractive(hot); }
    }
    bubble?.draw({ ...next, scale, x: next.x - area.x, y: next.y - area.y }, now, reduceMotion, bar.y - area.y + bar.height);
    if(celebrations?.draw({...next,scale,x:next.x-area.x,y:next.y-area.y,returning:motion.returning},now,enabled,reduceMotion) && enabled)motion.reach(now);
    document.body.dataset.mood = next.mode;
    window.__buildlingsFrame = { ...next, scale, pet: selected };
    window.dispatchEvent(new CustomEvent('companion-frame', { detail: window.__buildlingsFrame }));
    if (reportClock.due(now) || window.__reportedArea !== next.areaId) {
      window.__reportedArea = next.areaId;
      window.companion.report?.({ x: next.x, y: next.y, mode: next.mode, hop: next.hop * scale, scale, sparkleId: next.sparkleId, areaId: next.areaId, renderer: window.__buildlingsRenderer?.type, hudRect: bar, returning:motion.returning, edge:next.edge });
    }
  }
  } catch { if (frameFailures++ < 3) { window.companion.diagnostic?.({type:'renderer-error'}); hud?.showMessage('The monkey drawing stopped. Restart desktop overlay from the tray.'); } }
}
requestAnimationFrame(frame);
window.companion.ready();
