'use strict';
const { PETS, initialState, validateState, validatePack, styledPet, remainingTime, startSession, togglePause, tick, shipBuild, petSVG } = window.Buildlings;
const KEY = 'buildlings.progress.v1';
const $ = selector => document.querySelector(selector);
let state = initialState();
let storageAvailable = true;
let celebrationUntil = 0;
let petMessageUntil = 0;
let petMessage = '';
let audioContext;

try {
  const saved = localStorage.getItem(KEY);
  if (saved) state = validateState(JSON.parse(saved));
} catch {
  $('#global-status').textContent = 'Saved progress could not be loaded. This session starts fresh; existing storage has not been changed.';
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch {
    storageAvailable = false;
    $('.local-label').textContent = 'Session only · save a backup';
    $('#global-status').textContent = 'This browser cannot save progress. Use “Save progress backup” before leaving.';
  }
}
function currentPet() { return styledPet(PETS.find(p => p.id === state.selected), state.pack); }
function updatePetArt(element, pet, activeMood = 'idle') {
  const signature = `${pet.id}:${activeMood}:${pet.color}:${pet.dark}:${pet.blush}`;
  if (element.dataset.signature === signature) return;
  element.innerHTML = petSVG(pet, activeMood);
  element.dataset.signature = signature;
}
function mood() { return Date.now() < celebrationUntil ? 'celebrate' : state.session?.status === 'building' ? 'building' : state.session?.status === 'ready' ? 'ready' : 'idle'; }
function say(message, seconds = 5) { petMessage = message; petMessageUntil = Date.now() + seconds * 1000; }
function message() {
  if (Date.now() < petMessageUntil) return petMessage;
  if (state.session?.status === 'ready') return 'Time’s up. How did our little build go?';
  if (state.session?.status === 'paused') return 'A little stretch? I’ll wait right here.';
  if (state.session) return 'You make the thing. I’ll bring the vibes.';
  return state.shipped ? 'That next little idea? I believe in it.' : 'Oh hi. Shall we make something?';
}
function timeText(ms) { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

function render() {
  const pet = currentPet();
  const activeMood = mood();
  $('#pet-stage').dataset.mood = activeMood;
  updatePetArt($('#pet-art'), pet, activeMood);
  updatePetArt($('#share-mini'), pet);
  $('#pet-button').setAttribute('aria-label', `Give ${pet.name} a little boop`);
  $('#pet-name').textContent = `${pet.name} ${pet.symbol}`;
  $('#pet-description').textContent = pet.description;
  $('#pet-message').textContent = message();
  const moodLabel = { idle: 'Just vibing', building: 'Making a thing', ready: 'Ready to celebrate', celebrate: 'Proud of you' }[activeMood];
  $('#mood-badge').replaceChildren(Object.assign(document.createElement('span'), { className: 'mood-dot' }), document.createTextNode(moodLabel));
  $('#build-count').textContent = `${state.shipped} shipped`;
  const nextPet = PETS.find(p => p.threshold > state.shipped);
  $('#next-friend-label').textContent = nextPet ? `${nextPet.threshold - state.shipped} shipped ${nextPet.threshold - state.shipped === 1 ? 'build' : 'builds'} until your next friend` : 'Your whole little crew is here. Keep making things.';
  const progress = $('.collection-progress');
  const target = nextPet?.threshold || PETS[PETS.length - 1].threshold;
  progress.setAttribute('aria-valuemax', String(target));
  progress.setAttribute('aria-valuenow', String(Math.min(state.shipped, target)));
  $('#collection-progress-fill').style.width = `${Math.min(100, state.shipped / target * 100)}%`;
  $('#session-form').hidden = Boolean(state.session);
  $('#active-session').hidden = !state.session;
  $('#demo-button').hidden = Boolean(state.session);
  $('#session-title').textContent = state.session ? state.session.status === 'ready' ? 'A little moment to celebrate.' : 'One thing at a time.' : 'Let’s make a thing.';
  if (state.session) {
    const remaining = remainingTime(state.session, Date.now());
    $('#active-title').textContent = state.session.title;
    $('#timer').textContent = timeText(remaining);
    $('#timer-progress').style.width = `${Math.min(100, Math.max(0, (1 - remaining / state.session.duration) * 100))}%`;
    $('#pause-button').textContent = state.session.status === 'paused' ? 'Resume' : 'Pause';
    $('#pause-button').disabled = state.session.status === 'ready';
  }
  $('#sound-button').textContent = state.sound ? 'Sound on' : 'Sound off';
  $('#sound-button').setAttribute('aria-pressed', String(state.sound));
  $('#pack-label').textContent = state.pack ? `${state.pack.name} colours` : 'Classic companion colours';
  $('#classic-button').hidden = !state.pack;
  renderCollection();
  renderLog();
}

function renderCollection() {
  const grid = $('#collection-grid');
  grid.replaceChildren();
  for (const pet of PETS) {
    const unlocked = state.shipped >= pet.threshold;
    const selected = state.selected === pet.id;
    const card = document.createElement('article');
    card.className = `collection-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}`;
    card.style.setProperty('--pet-tint', pet.color);
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = !unlocked;
    button.setAttribute('aria-label', unlocked ? `Choose ${pet.name}` : `${pet.name}, unlock after ${pet.threshold} shipped ${pet.threshold === 1 ? 'build' : 'builds'}`);
    button.setAttribute('aria-pressed', String(selected));
    const art = document.createElement('span');
    art.className = 'collection-art';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = petSVG(styledPet(pet, state.pack));
    const name = document.createElement('strong'); name.textContent = pet.name;
    const tagline = document.createElement('span'); tagline.className = 'collection-tagline'; tagline.textContent = pet.tagline;
    const badge = document.createElement('span'); badge.className = 'collection-badge'; badge.textContent = selected ? 'Your deskmate →' : unlocked ? 'Choose this friend →' : `Unlock at ${pet.threshold} ${pet.threshold === 1 ? 'build' : 'builds'} · locked`;
    button.append(art, name, tagline, badge);
    button.addEventListener('click', () => { state = { ...state, selected: pet.id }; persist(); say(`${pet.name} reporting for tiny-friend duty.`); render(); });
    card.append(button); grid.append(card);
  }
}

function renderLog() {
  const log = $('#build-log'); log.replaceChildren();
  if (!state.builds.length) {
    const empty = document.createElement('p'); empty.className = 'empty-log'; empty.textContent = 'Your first little win goes here. It doesn’t have to be a big one.'; log.append(empty); return;
  }
  for (const [index, build] of state.builds.slice(0, 5).entries()) {
    const item = document.createElement('div'); item.className = 'log-item';
    const icon = document.createElement('span'); icon.className = 'log-star'; icon.textContent = '✦';
    const title = document.createElement('span'); title.textContent = build.title;
    const date = document.createElement('time'); date.dateTime = new Date(build.at).toISOString(); date.textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(build.at));
    item.append(icon, title, date); log.append(item);
  }
}

function start(title, duration) {
  try { state = startSession(state, title, duration, Date.now()); persist(); say('A fresh little build. We’ve got this.'); $('#session-status').textContent = 'Finish whenever you’re ready. The timer is company, not a deadline.'; render(); }
  catch (error) { $('#session-status').textContent = error.message; }
}
function ship() {
  if (!state.session) return;
  const before = state.shipped;
  state = shipBuild(state, Date.now());
  persist();
  const newPet = PETS.find(p => p.threshold > before && p.threshold <= state.shipped);
  celebrationUntil = Date.now() + 8000;
  say(newPet ? `You shipped! And ${newPet.name} wants to meet you!` : 'You made a thing! Look at you go!', 8);
  $('#session-status').textContent = newPet ? `${newPet.name} unlocked. Choose your new friend in the collection.` : 'Build celebrated and saved. Small wins count.';
  burst(); chime(); render();
  $('#start-button').focus();
}
function burst() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = $('#confetti'); layer.replaceChildren();
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement('span'); piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${(Math.random() - .5) * 360}px`);
    piece.style.setProperty('--y', `${-80 - Math.random() * 190}px`);
    piece.style.setProperty('--rotation', `${Math.random() * 600}deg`);
    piece.style.background = ['#b8d075', '#edb396', '#b6a2db', '#ebcc67'][i % 4];
    piece.style.animationDelay = `${Math.random() * .12}s`; layer.append(piece);
  }
  setTimeout(() => layer.replaceChildren(), 2200);
}
function chime() {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
      const at = audioContext.currentTime + index * .12;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.065, at + .015); gain.gain.exponentialRampToValueAtTime(.001, at + .35);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + .4);
    });
  } catch { $('#global-status').textContent = 'Sound is unavailable in this browser. Your celebration still counts.'; }
}

$('#session-form').addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.currentTarget); start(data.get('title'), Number(data.get('duration')) * 60000); });
$('#demo-button').addEventListener('click', () => start('My first little build', 20000));
$('#ship-button').addEventListener('click', ship);
$('#pause-button').addEventListener('click', () => { state = togglePause(state, Date.now()); persist(); render(); });
$('#end-button').addEventListener('click', () => { state = { ...state, session: null }; persist(); say('Still here. A fresh start whenever you want.'); $('#session-status').textContent = 'Build ended. Your shipped count is unchanged.'; render(); $('#start-button').focus(); });
$('#pet-button').addEventListener('click', () => { say(['Boop received. Morale increased.', 'That’s a very good human.', 'I’m helping. Emotionally.', 'No thoughts. Just your biggest fan.'][Math.floor(Math.random() * 4)]); $('#pet-button').classList.remove('boop'); void $('#pet-button').offsetWidth; $('#pet-button').classList.add('boop'); render(); });
$('#sound-button').addEventListener('click', () => { state = { ...state, sound: !state.sound }; persist(); chime(); render(); });

$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } }));

function download(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
$('#backup-button').addEventListener('click', () => { download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'buildlings-progress.json'); $('#global-status').textContent = 'Backup prepared. Your saved file contains your build titles; keep it somewhere private.'; });
$('#restore-button').addEventListener('click', () => $('#restore-file').click());
$('#restore-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 100000) throw new Error('Backup is too large.');
    const restored = validateState(JSON.parse(await file.text()));
    if ((state.shipped || state.session) && !window.confirm('Replace the progress on this device with this backup? Save a backup first if you want to keep both.')) return;
    state = restored; persist(); render(); $('#global-status').textContent = storageAvailable ? 'Progress restored and saved on this device.' : 'Progress restored for this session. Browser storage is unavailable; keep your backup.';
  } catch { $('#global-status').textContent = 'That file is not a valid Buildlings backup. Your current progress is unchanged.'; }
  finally { event.target.value = ''; }
});

$('#pack-button').addEventListener('click', () => $('#pack-file').click());
$('#pack-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 20000) throw new Error('Pack is too large.');
    const pack = validatePack(JSON.parse(await file.text()));
    state = { ...state, pack }; persist(); render();
    $('#global-status').textContent = `${pack.name} colours applied. Your free companion unlocks and build progress are unchanged.`;
  } catch { $('#global-status').textContent = 'That file is not a valid Buildlings colour pack. Your current colours are unchanged.'; }
  finally { event.target.value = ''; }
});
$('#classic-button').addEventListener('click', () => { state = { ...state, pack: null }; persist(); render(); $('#global-status').textContent = 'Classic colours restored. You can re-add your pack from its file at any time.'; });

async function drawShareCard() {
  const canvas = $('#share-canvas'); const ctx = canvas.getContext('2d'); const pet = currentPet();
  ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = '#e9e7de'; ctx.fillRect(60, 60, 1080, 1); ctx.fillRect(60, 739, 1080, 1);
  ctx.fillStyle = '#344039'; ctx.font = 'bold 30px system-ui'; ctx.fillText('buildlings ✳', 70, 112);
  ctx.font = '16px system-ui'; ctx.fillStyle = '#697267'; ctx.fillText('TINY FRIENDS. BIG LITTLE BUILDS.', 70, 152);
  ctx.fillStyle = '#f0eedf'; ctx.beginPath(); ctx.ellipse(852, 428, 244, 245, 0, 0, Math.PI * 2); ctx.fill();
  const url = URL.createObjectURL(new Blob([petSVG(pet, 'celebrate')], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode(); ctx.drawImage(image, 620, 218, 465, 413);
  } finally { URL.revokeObjectURL(url); }
  ctx.fillStyle = '#344039'; ctx.font = '58px Georgia'; ctx.fillText('Made a thing.', 70, 318); ctx.fillText('Kept a little friend.', 70, 390);
  ctx.font = 'bold 93px system-ui'; ctx.fillText(String(state.shipped), 70, 538);
  ctx.font = '21px system-ui'; ctx.fillStyle = '#697267'; ctx.fillText(state.shipped === 1 ? 'little build shipped' : 'little builds shipped', 75, 580);
  ctx.font = '20px Georgia'; ctx.fillStyle = '#344039'; ctx.fillText(`${pet.name} · ${pet.personality}`, 702, 664);
  ctx.font = '17px system-ui'; ctx.fillStyle = '#697267'; ctx.fillText('Small wins count.', 70, 706);
  $('#download-status').textContent = '';
}
$('#share-button').addEventListener('click', async () => { $('#share-dialog').showModal(); $('#download-card').disabled = true; try { await drawShareCard(); $('#download-card').disabled = false; } catch { $('#download-status').textContent = 'The image could not be prepared. Close this window and try again.'; } });
$('#download-card').addEventListener('click', () => { $('#share-canvas').toBlob(blob => { if (blob) { download(blob, `buildlings-${currentPet().id}-${state.shipped}.png`); $('#download-status').textContent = 'Card prepared for download. No image was posted or uploaded.'; } else { $('#download-status').textContent = 'Download unavailable. Please try again.'; } }, 'image/png'); });

window.addEventListener('storage', event => {
  if (event.key !== KEY) return;
  try { state = event.newValue ? validateState(JSON.parse(event.newValue)) : initialState(); render(); }
  catch { $('#global-status').textContent = 'Progress from another tab could not be loaded. Your current session is unchanged.'; }
});
setInterval(() => {
  const updated = tick(state, Date.now());
  if (updated !== state) { state = updated; persist(); $('#session-status').textContent = 'Your companion is ready to celebrate. Mark it shipped when your work is done.'; }
  // Keep controls in place while focused; only redraw the clock, expressions, and speech.
  if (state.session) { $('#timer').textContent = timeText(remainingTime(state.session, Date.now())); $('#timer-progress').style.width = `${Math.min(100, Math.max(0, (1 - remainingTime(state.session, Date.now()) / state.session.duration) * 100))}%`; $('#pause-button').disabled = state.session.status === 'ready'; }
  const m = mood(); $('#pet-stage').dataset.mood = m; updatePetArt($('#pet-art'), currentPet(), m); $('#pet-message').textContent = message();
  $('#mood-badge').replaceChildren(Object.assign(document.createElement('span'), { className: 'mood-dot' }), document.createTextNode({ idle: 'Just vibing', building: 'Making a thing', ready: 'Ready to celebrate', celebrate: 'Proud of you' }[m]));
  if (state.session?.status === 'ready') $('#session-title').textContent = 'A little moment to celebrate.';
}, 500);

state = tick(state, Date.now());
render();
