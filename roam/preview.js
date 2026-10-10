(() => {
'use strict';
const { CompanionMotion } = window.BuildlingsMotion;
const initialCursor = { x: innerWidth / 2, y: innerHeight / 2 };
let cursor = initialCursor;
let selected = 'sprout';
const motion = new CompanionMotion({ areas: [{ id: 'browser', x: 0, y: 0, width: innerWidth, height: innerHeight }], now: performance.now() });
const host = document.querySelector('#companion-host');
window.addEventListener('pointermove', event => cursor = { x: event.clientX, y: event.clientY });
window.addEventListener('resize', () => motion.setAreas([{ id: 'browser', x: 0, y: 0, width: innerWidth, height: innerHeight }]));
document.querySelectorAll('[data-pet]').forEach(button => button.addEventListener('click', () => {
  selected = button.dataset.pet;
  document.querySelectorAll('[data-pet]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
}));
document.querySelector('#pause').addEventListener('click', event => {
  motion.pause(!motion.paused, performance.now()); event.currentTarget.textContent = motion.paused ? 'Resume wandering' : 'Pause wandering';
});
document.querySelector('#call').addEventListener('click', () => {
  motion.pause(false, performance.now()); document.querySelector('#pause').textContent = 'Pause wandering';
  motion.followCursor(cursor, performance.now());
});
document.querySelector('#chasing').addEventListener('change', event => { motion.chaseEnabled = event.target.checked; if (!motion.chaseEnabled && motion.mode === 'chase') motion.pause(false, performance.now()); });
document.querySelector('#hopping').addEventListener('change', event => { motion.hopsEnabled = event.target.checked; if (!motion.hopsEnabled) motion.hopStart = null; });
const moods = { idle: 'Taking a tiny breather.', wander: 'Off on a little adventure.', curious: 'Hmm. What are you making?', chase: 'Wait for me, cursor!', pet: 'Petting detected. Tiny heart: full.', rest: 'Resting. Still available for head pats.' };
function frame(now) {
  const next = motion.advance(now, cursor);
  host.style.transform = `translate(${next.windowX}px,${next.windowY}px)`;
  window.companion.listener?.({ ...next, pet: selected });
  const status = document.querySelector('#status'); if (status.textContent !== moods[next.mode]) status.textContent = moods[next.mode];
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
