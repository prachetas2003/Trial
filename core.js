(function (root) {
  'use strict';
  const PETS = [
    { id: 'sprout', name: 'Sprout', tagline: 'A little green optimist.', description: 'A little green optimist. Believes in your next commit.', color: '#d4e789', dark: '#b0c65c', blush: '#f4ad9d', threshold: 0, symbol: '✳', personality: 'optimist' },
    { id: 'ember', name: 'Ember', tagline: 'Small fox. Big main-character energy.', description: 'Small fox. Big main-character energy. Your personal hype crew.', color: '#efb297', dark: '#d88770', blush: '#ed8f88', threshold: 1, symbol: '✦', personality: 'hype friend' },
    { id: 'orbit', name: 'Orbit', tagline: 'Head in the clouds. Heart in your code.', description: 'Head in the clouds. Heart in your code. An excellent space cadet.', color: '#cbc0ec', dark: '#a697d2', blush: '#f1adc3', threshold: 3, symbol: '☾', personality: 'space cadet' }
  ];
  function initialState() { return { version: 1, selected: 'sprout', shipped: 0, builds: [], session: null, sound: false, pack: null }; }
  function validatePack(value) {
    if (!value || value.format !== 'buildlings-colours-v1' || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 40 || !value.palettes) throw new Error('Invalid colour pack');
    const palettes = {};
    for (const pet of PETS) {
      const colors = value.palettes[pet.id];
      if (!colors || !['color', 'dark', 'blush'].every(key => typeof colors[key] === 'string' && /^#[0-9a-f]{6}$/i.test(colors[key]))) throw new Error('Invalid pack colours');
      palettes[pet.id] = { color: colors.color, dark: colors.dark, blush: colors.blush };
    }
    return { format: 'buildlings-colours-v1', name: value.name.trim(), palettes };
  }
  function styledPet(pet, pack) { return pack ? { ...pet, ...pack.palettes[pet.id] } : pet; }
  function validateState(value) {
    if (!value || value.version !== 1 || !Number.isSafeInteger(value.shipped) || value.shipped < 0 || value.shipped > 1000000 || !Array.isArray(value.builds) || value.builds.length > 30) throw new Error('Invalid progress data');
    if (!PETS.some(p => p.id === value.selected && p.threshold <= value.shipped)) throw new Error('Invalid companion');
    const builds = value.builds.map(b => {
      if (!b || typeof b.title !== 'string' || b.title.length > 80 || !Number.isFinite(b.at) || b.at < 0 || b.at > 8640000000000000) throw new Error('Invalid build history');
      return { title: b.title, at: b.at };
    });
    if (value.shipped < builds.length) throw new Error('Invalid build count');
    let session = null;
    if (value.session) {
      const s = value.session;
      if (typeof s.title !== 'string' || s.title.length > 80 || !Number.isFinite(s.duration) || s.duration < 1000 || s.duration > 1500000 || !Number.isFinite(s.endAt) || s.endAt < 0 || s.endAt > 8640000000000000 || !['building', 'paused', 'ready'].includes(s.status) || !Number.isFinite(s.remaining) || s.remaining < 0 || s.remaining > s.duration) throw new Error('Invalid session');
      session = { title: s.title, duration: s.duration, endAt: s.endAt, remaining: s.remaining, status: s.status };
    }
    return { version: 1, selected: value.selected, shipped: value.shipped, builds, session, sound: Boolean(value.sound), pack: value.pack ? validatePack(value.pack) : null };
  }
  function remainingTime(session, now) { return session.status === 'paused' ? session.remaining : Math.max(0, session.endAt - now); }
  function startSession(state, title, duration, now) {
    if (state.session) throw new Error('Finish or end your current build first.');
    if (!Number.isFinite(duration) || duration < 1000 || duration > 1500000) throw new Error('Choose a valid build duration.');
    return { ...state, session: { title: String(title).trim().slice(0, 80) || 'A little thing', duration, endAt: now + duration, remaining: duration, status: 'building' } };
  }
  function togglePause(state, now) {
    if (!state.session || state.session.status === 'ready') return state;
    const s = state.session;
    if (s.status === 'paused') return { ...state, session: { ...s, endAt: now + s.remaining, status: 'building' } };
    return { ...state, session: { ...s, remaining: remainingTime(s, now), status: 'paused' } };
  }
  function tick(state, now) {
    if (!state.session || state.session.status !== 'building' || remainingTime(state.session, now) > 0) return state;
    return { ...state, session: { ...state.session, remaining: 0, status: 'ready' } };
  }
  function shipBuild(state, now) {
    if (!state.session) return state;
    return { ...state, shipped: state.shipped + 1, builds: [{ title: state.session.title, at: now }, ...state.builds].slice(0, 30), session: null };
  }
  function petSVG(pet, mood = 'idle') {
    const eyes = mood === 'celebrate' ? '<path d="M99 126q9-13 18 0m36 0q9-13 18 0" fill="none" stroke="#354039" stroke-width="5" stroke-linecap="round"/>' : '<ellipse class="eye" cx="108" cy="126" rx="5.5" ry="7" fill="#354039"/><ellipse class="eye" cx="161" cy="126" rx="5.5" ry="7" fill="#354039"/>';
    let ears = '<path d="M78 87Q62 38 86 41q25 9 26 37m47 0q8-43 31-41 23 11 1 54" fill="' + pet.color + '" stroke="#354039" stroke-width="3.5" stroke-linejoin="round"/><path d="M80 57l13 18m82-1 10-21" stroke="' + pet.dark + '" stroke-width="7" stroke-linecap="round"/>';
    let detail = '';
    if (pet.id === 'ember') { ears = '<path d="M76 92L69 37q22 1 42 43m48-1q19-46 45-44l-10 62" fill="' + pet.color + '" stroke="#354039" stroke-width="3.5" stroke-linejoin="round"/><path d="M80 55l16 25m83 0 12-26" stroke="' + pet.dark + '" stroke-width="8" stroke-linecap="round"/>'; detail = '<path d="M111 99q23 13 46 0l-6 40h-35z" fill="#f7e3c5" opacity=".65"/>'; }
    if (pet.id === 'orbit') { ears = '<path d="M90 84Q67 46 47 59m128 25q27-45 48-24" fill="none" stroke="#354039" stroke-width="3.5" stroke-linecap="round"/><circle cx="45" cy="59" r="12" fill="' + pet.color + '" stroke="#354039" stroke-width="3.5"/><circle cx="225" cy="59" r="12" fill="' + pet.color + '" stroke="#354039" stroke-width="3.5"/>'; detail = '<path d="M130 82l4-9 4 9 9 4-9 4-4 9-4-9-9-4z" fill="#f4e5b5"/>'; }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 240" class="pet-svg" fill="none"><g class="pet-body">${ears}<path d="M77 194q-13 15 2 23 22 8 35-10m41 1q13 16 33 8 13-9 1-22" fill="${pet.dark}" stroke="#354039" stroke-width="3.5"/><path d="M65 133q-15 3-23 19-5 12 7 17 10 4 20-6m135-31q16 3 24 20 5 12-7 17-11 4-21-7" fill="${pet.color}" stroke="#354039" stroke-width="3.5" stroke-linecap="round"/><path d="M65 123q-2-53 68-53 71 0 71 58v28q0 53-70 53-70 0-70-51z" fill="${pet.color}" stroke="#354039" stroke-width="3.5"/>${detail}<ellipse cx="87" cy="145" rx="12" ry="7" fill="${pet.blush}" opacity=".75"/><ellipse cx="183" cy="145" rx="12" ry="7" fill="${pet.blush}" opacity=".75"/>${eyes}<path d="M126 146q8 8 16 0" stroke="#354039" stroke-width="3" stroke-linecap="round"/><path d="M117 180q17 10 33 0" stroke="${pet.dark}" stroke-width="3" stroke-linecap="round" opacity=".65"/></g></svg>`;
  }
  const api = { PETS, initialState, validateState, validatePack, styledPet, remainingTime, startSession, togglePause, tick, shipBuild, petSVG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Buildlings = api;
})(typeof window !== 'undefined' ? window : globalThis);
