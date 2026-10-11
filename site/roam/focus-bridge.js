(() => {
  'use strict';
  const api = window.companion, key = 'mischief-focus-preview-v1';
  let saved = {}, saveError = '', lastSave = 0, nextQuote = Date.now() + 15000, ink = 'black';
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; }
  catch { saveError = 'Your saved browser data could not be read. This session starts fresh.'; }
  if (saved.ink === 'white') ink = 'white';
  const focus = new window.MischiefFocus.FocusCompanion({ saved, bank: window.MischiefQuotes });
  const listeners = new Set(); let viewListener = () => {}, highlight = null;
  const quoteDelay = () => focus.preferences.quoteSeconds * 1000 * (.8 + Math.random() * .4);
  const mode = () => focus.presence();
  const snapshot = () => ({ ...focus.snapshot(), ink, saveError, highlight });
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ ...focus.export(), ink })); saveError = ''; }
    catch { saveError = 'Browser storage is unavailable or full. Your changes last only while this page stays open.'; }
    lastSave = Date.now();
  }
  function state() { api.send({ presence: mode(), visible: mode() !== 'hidden', preferences: focus.preferences }); for (const listener of listeners) listener(snapshot()); }
  function events() {
    for (const event of focus.drainEvents()) {
      if (event.type === 'quote') { api.send({ quote: event.quote }); nextQuote = Date.now() + Math.max(25000, quoteDelay()); }
      if (event.type === 'stayed') api.send({ action: 'ack' });
      if (event.type === 'finished' || event.type === 'break-finished') {
        highlight = { kind: event.type === 'finished' ? 'focus' : 'break', id: event.summary?.id || event.id, completed: event.summary?.completed ?? event.completed };
        api.send({ completion: { ...highlight, completed: event.summary?.completed ?? event.completed, sound: focus.preferences.completionSound } });
      }
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
      if (action.type === 'start') highlight = null;
      if (action.type === 'chase' && focus.preferences.chaseCursor) window.dispatchEvent(new Event('companion-chase-start'));
      if (action.type === 'preferences' && 'quoteSeconds' in (action.values || {})) nextQuote = Date.now() + quoteDelay();
    } catch (e) { error = e.message; }
    events(); save(); state(); return { error, state: snapshot() };
  };
  api.getFocusState = async () => snapshot();
  api.onFocusState = callback => { listeners.add(callback); callback(snapshot()); return () => listeners.delete(callback); };
  api.onFocusView = callback => { viewListener = callback; };
  api.hideFocus = () => document.querySelector('#focus-dialog').close();
  api.openFocus = view => { highlight = null; state(); document.querySelector('#focus-dialog').showModal(); viewListener(view); };
  api.focusInk = ink;
  window.__mischiefFocus = focus;
  state();
  setInterval(() => {
    focus.tick(Date.now());
    if (Date.now() >= nextQuote && !focus.events.some(e => e.type === 'quote')) {
      const s = focus.session, p = focus.preferences;
      if (p.autoQuotes && mode() !== 'hidden' && (!s || s.kind === 'break' || !p.quietFocus)) focus.quote();
      nextQuote = Date.now() + quoteDelay();
    }
    const changed = focus.events.length > 0;
    events(); if (changed || (focus.session?.running && Date.now() - lastSave >= 10000)) save(); state();
  }, 1000);
  window.addEventListener('pagehide', () => { focus.dispatch({ type: 'pause' }); save(); });
  document.addEventListener('keydown', event => {
    if (!event.ctrlKey || !event.altKey) return;
    if (event.code === 'KeyS') { event.preventDefault(); api.focusAction({ type: 'stay' }); }
    if (event.code === 'KeyF' || event.code === 'KeyT') { event.preventDefault(); api.openFocus(event.code === 'KeyT' ? 'thought' : 'timer'); }
    if (event.code === 'KeyH') { event.preventDefault(); api.focusAction({ type: 'presence', value: mode() === 'wander' ? 'peek' : 'wander' }); }
  });
})();
