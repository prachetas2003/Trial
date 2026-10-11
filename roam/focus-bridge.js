(() => {
  'use strict';
  const api = window.companion, key = 'mischief-focus-preview-v1';
  let saved = {}, saveError = '', lastSave = 0, nextQuote = Date.now() + 45000, ink = 'black';
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; }
  catch { saveError = 'Your saved browser data could not be read. This session starts fresh.'; }
  if (saved.ink === 'white') ink = 'white';
  const focus = new window.MischiefFocus.FocusCompanion({ saved, bank: window.MischiefQuotes });
  let listener = () => {}, viewListener = () => {};
  const mode = () => focus.preferences.presence === 'hidden' ? 'hidden' : focus.preferences.presence === 'peek' || (focus.preferences.peekDuringFocus && focus.session?.kind === 'focus') ? 'peek' : 'wander';
  const snapshot = () => ({ ...focus.snapshot(), ink, saveError });
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ ...focus.export(), ink })); saveError = ''; }
    catch { saveError = 'Browser storage is unavailable or full. Your changes last only while this page stays open.'; }
    lastSave = Date.now();
  }
  function state() { api.send({ presence: mode(), visible: mode() !== 'hidden' }); listener(snapshot()); }
  function events() {
    for (const event of focus.drainEvents()) {
      if (event.type === 'quote') api.send({ quote: event.quote });
      if (event.type === 'stayed') api.send({ action: 'ack' });
      if (event.type === 'finished' || event.type === 'break-finished') nextQuote = Date.now() + 5 * 60000;
    }
  }
  api.focusAction = async action => {
    let error = '';
    try {
      if (action.type === 'appearance') {
        if (!['black', 'white'].includes(action.ink)) throw new Error('Choose a marker colour.');
        ink = action.ink; api.focusInk = ink; api.send({ settings: { ink } });
        window.dispatchEvent(new CustomEvent('companion-appearance', { detail: ink }));
      } else focus.dispatch(action);
    } catch (e) { error = e.message; }
    events(); save(); state(); return { error, state: snapshot() };
  };
  api.getFocusState = async () => snapshot();
  api.onFocusState = callback => { listener = callback; callback(snapshot()); };
  api.onFocusView = callback => { viewListener = callback; };
  api.hideFocus = () => document.querySelector('#focus-dialog').close();
  api.openFocus = view => { document.querySelector('#focus-dialog').showModal(); viewListener(view); };
  api.focusInk = ink;
  window.__mischiefFocus = focus;
  state();
  setInterval(() => {
    focus.tick(Date.now());
    if (Date.now() >= nextQuote) {
      const s = focus.session, p = focus.preferences;
      if (p.autoQuotes && mode() !== 'hidden' && (!s || s.kind === 'break' || !p.quietFocus)) focus.quote();
      nextQuote = Date.now() + (3 + Math.random() * 4) * 60000;
    }
    const changed = focus.events.length > 0;
    events(); if (changed || (focus.session?.running && Date.now() - lastSave >= 10000)) save(); state();
  }, 1000);
  window.addEventListener('pagehide', () => { focus.dispatch({ type: 'pause' }); save(); });
  document.addEventListener('keydown', event => {
    if (!event.ctrlKey || !event.altKey) return;
    if (event.code === 'KeyS') { event.preventDefault(); api.focusAction({ type: 'stay' }); }
    if (event.code === 'KeyF' || event.code === 'KeyT') { event.preventDefault(); api.openFocus(event.code === 'KeyT' ? 'thought' : 'timer'); }
    if (event.code === 'KeyH') { event.preventDefault(); api.focusAction({ type: 'preferences', values: { presence: mode() === 'wander' ? 'peek' : 'wander', peekDuringFocus: false } }); }
  });
})();
