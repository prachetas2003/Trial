(function (root) {
  'use strict';
  const MINUTE = 60000;
  const defaults = { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, presence: 'wander', peekDuringFocus: true, autoQuotes: true, quietFocus: false, quoteSeconds: 12, dragEnabled: true, chaseCursor: false, completionSound: true, returnAfterSession: true, edge: 'right', edgePosition: .85 };
  const integer = (value, lo, hi, fallback) => Number.isFinite(value) ? Math.max(lo, Math.min(hi, Math.round(value))) : fallback;
  const line = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : '';
  const copy = value => JSON.parse(JSON.stringify(value));
  function preferences(saved = {}) {
    const out = { ...defaults };
    for (const key of ['focusMinutes', 'breakMinutes', 'longBreakMinutes']) out[key] = integer(saved[key], 1, key === 'focusMinutes' ? 180 : 60, out[key]);
    if (['wander', 'peek', 'hidden'].includes(saved.presence)) out.presence = saved.presence;
    for (const key of ['peekDuringFocus', 'autoQuotes', 'quietFocus']) if (typeof saved[key] === 'boolean') out[key] = saved[key];
    out.quoteSeconds = integer(saved.quoteSeconds, 12, 180, out.quoteSeconds);
    if (['left', 'right', 'top', 'bottom'].includes(saved.edge)) out.edge = saved.edge;
    if (Number.isFinite(saved.edgePosition)) out.edgePosition = Math.max(0, Math.min(1, saved.edgePosition));
    for (const key of ['dragEnabled', 'chaseCursor', 'completionSound', 'returnAfterSession']) if (typeof saved[key] === 'boolean') out[key] = saved[key];
    return out;
  }
  class FocusCompanion {
    constructor({ saved = {}, bank, random = Math.random, now = Date.now() }) {
      this.bank = bank; this.random = random; this.events = []; this.serial = 0;
      const updatingQuotes = saved.version === 1;
      this.preferences = preferences(updatingQuotes ? { ...saved.preferences, quoteSeconds: 12 } : saved.preferences);
      this.notes = Array.isArray(saved.notes) ? saved.notes.filter(n => n && typeof n.id === 'string' && typeof n.text === 'string').slice(0, 500).map(n => ({ id: line(n.id, 100), text: line(n.text, 1000), done: n.done === true, createdAt: integer(n.createdAt, 0, Number.MAX_SAFE_INTEGER, now) })) : [];
      this.history = Array.isArray(saved.history) ? saved.history.filter(s => s && typeof s.id === 'string' && Number.isFinite(s.elapsedMs) && Number.isFinite(s.endedAt)).slice(0, 50).map(s => ({ id: line(s.id, 100), intention: line(s.intention, 160), elapsedMs: integer(s.elapsedMs, 0, 180 * MINUTE, 0), planMs: integer(s.planMs, MINUTE, 180 * MINUTE, 25 * MINUTE), choices: integer(s.choices, 0, 99999, 0), endedAt: s.endedAt, completed: s.completed === true })) : [];
      this.completedSessions = Math.max(this.history.filter(s => s.completed).length, integer(saved.completedSessions, 0, Number.MAX_SAFE_INTEGER, 0));
      this.decks = {}; this.lastQuotes = {};
      for (const category of ['everyday', 'hard']) {
        const valid = new Set(bank[category].map(q => q.id));
        this.decks[category] = !updatingQuotes && Array.isArray(saved.decks?.[category]) ? [...new Set(saved.decks[category].filter(id => valid.has(id)))] : [];
        this.lastQuotes[category] = !updatingQuotes && valid.has(saved.lastQuotes?.[category]) ? saved.lastQuotes[category] : null;
      }
      this.session = null; this.recovered = false;
      const s = saved.session;
      if (s && ['focus', 'break'].includes(s.kind) && Number.isFinite(s.planMs) && typeof s.id === 'string') {
        this.session = { id: line(s.id, 100), kind: s.kind, planMs: integer(s.planMs, MINUTE, 180 * MINUTE, 25 * MINUTE), elapsedMs: integer(s.elapsedMs, 0, 180 * MINUTE, 0), running: false, segmentStartedAt: now, startedAt: integer(s.startedAt, 0, Number.MAX_SAFE_INTEGER, now), intention: line(s.intention, 160), choices: integer(s.choices, 0, 99999, 0), lastChoiceAt: null, presenceOverride: ['wander', 'peek'].includes(s.presenceOverride) ? s.presenceOverride : null };
        this.session.elapsedMs = Math.min(this.session.elapsedMs, this.session.planMs);
        this.recovered = true;
      }
    }
    presence() {
      const p = this.preferences;
      if (p.presence === 'hidden') return 'hidden';
      if (this.session?.kind === 'focus' && this.session.presenceOverride) return this.session.presenceOverride;
      if (p.chaseCursor) return 'wander';
      return p.presence === 'peek' || (p.peekDuringFocus && this.session?.kind === 'focus') ? 'peek' : 'wander';
    }
    id(now) { return `${now.toString(36)}-${(++this.serial).toString(36)}-${Math.floor(this.random() * 1e9).toString(36)}`; }
    elapsed(now) { const s = this.session; return s ? Math.min(s.planMs, s.elapsedMs + (s.running ? Math.max(0, now - s.segmentStartedAt) : 0)) : 0; }
    quote(category = 'everyday', now = Date.now()) {
      if (!this.decks[category].length) {
        const ids = this.bank[category].map(q => q.id);
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        if (ids.length > 1 && ids.at(-1) === this.lastQuotes[category]) [ids[0], ids[ids.length - 1]] = [ids.at(-1), ids[0]];
        this.decks[category] = ids;
      }
      const id = this.decks[category].pop(); this.lastQuotes[category] = id;
      const q = this.bank[category].find(q => q.id === id);
      this.events.push({ type: 'quote', quote: { ...q, category, spokenAt: now } });
      return q;
    }
    finish(now, completed) {
      const s = this.session;
      if (!s) return;
      if (s.kind === 'focus') {
        const record = { id: s.id, intention: s.intention, elapsedMs: this.elapsed(now), planMs: s.planMs, choices: s.choices, endedAt: now, completed };
        this.history.unshift(record); this.history = this.history.slice(0, 50);
        if (completed) this.completedSessions++;
        this.events.push({ type: 'finished', summary: record });
      } else this.events.push({ type: 'break-finished', id: s.id, completed });
      if (s.kind === 'focus') {
        if (this.preferences.returnAfterSession && this.preferences.presence === 'peek') this.preferences.presence = 'wander';
        else if (!this.preferences.returnAfterSession && this.presence() === 'peek') this.preferences.presence = 'peek';
      }
      this.session = null; this.recovered = false;
      this.quote('everyday', now);
    }
    tick(now) { if (this.session?.running && this.elapsed(now) >= this.session.planMs) this.finish(now, true); }
    dispatch(action, now = Date.now()) {
      this.tick(now);
      if (!action || typeof action !== 'object') throw new Error('Choose an action.');
      switch (action.type) {
        case 'start': {
          if (this.session) throw new Error('Finish the current timer before starting another.');
          const kind = action.kind === 'break' ? 'break' : 'focus';
          const minutes = kind === 'focus' ? this.preferences.focusMinutes : this.completedSessions > 0 && this.completedSessions % 4 === 0 ? this.preferences.longBreakMinutes : this.preferences.breakMinutes;
          this.session = { id: this.id(now), kind, planMs: minutes * MINUTE, elapsedMs: 0, running: true, segmentStartedAt: now, startedAt: now, intention: line(action.intention, 160), choices: 0, lastChoiceAt: null, presenceOverride: null };
          this.recovered = false;
          this.events.push({ type: 'started', kind });
          break;
        }
        case 'pause':
          if (!this.session?.running) break;
          this.session.elapsedMs = this.elapsed(now); this.session.running = false; break;
        case 'resume':
          if (!this.session || this.session.running) break;
          this.session.running = true; this.session.segmentStartedAt = now; this.recovered = false; break;
        case 'end': this.finish(now, false); break;
        case 'stay': {
          const s = this.session;
          if (!s || s.kind !== 'focus' || !s.running) throw new Error('Start or resume a focus session to record a choice.');
          if (s.lastChoiceAt !== null && now - s.lastChoiceAt < 2000) throw new Error('Already counted. Give this choice a moment.');
          s.lastChoiceAt = now; s.choices = Math.min(99999, s.choices + 1);
          this.events.push({ type: 'stayed', choices: s.choices }); this.quote('hard', now); break;
        }
        case 'quote': this.quote(action.category === 'hard' ? 'hard' : 'everyday', now); break;
        case 'presence': {
          if (!['wander', 'peek', 'hidden'].includes(action.value)) throw new Error('Choose how the monkey appears.');
          if (action.value !== 'wander') this.preferences.chaseCursor = false;
          if (action.value !== 'hidden' && this.session?.kind === 'focus') {
            if (this.preferences.presence === 'hidden') this.preferences.presence = 'wander';
            this.session.presenceOverride = action.value;
          } else this.preferences.presence = action.value;
          break;
        }
        case 'chase': {
          this.preferences.chaseCursor = typeof action.enabled === 'boolean' ? action.enabled : !this.preferences.chaseCursor;
          if (this.preferences.chaseCursor) {
            this.preferences.presence = 'wander';
            if (this.session?.kind === 'focus') this.session.presenceOverride = 'wander';
          }
          break;
        }
        case 'preferences': this.preferences = preferences({ ...this.preferences, ...action.values }); break;
        case 'note-add': {
          const text = line(action.text, 1000);
          if (!text) throw new Error('Write the thought you want to save.');
          if (this.notes.length >= 500) throw new Error('Your notebook is full. Remove an old thought to make room.');
          this.notes.unshift({ id: this.id(now), text, done: false, createdAt: now }); break;
        }
        case 'note-toggle': { const n = this.notes.find(n => n.id === action.id); if (n) n.done = !n.done; break; }
        case 'note-delete': this.notes = this.notes.filter(n => n.id !== action.id); break;
        default: throw new Error('That action is not available.');
      }
    }
    drainEvents() { return this.events.splice(0); }
    snapshot(now = Date.now()) {
      return copy({ presence: this.presence(), preferences: this.preferences, notes: this.notes, history: this.history, recovered: this.recovered, session: this.session ? { ...this.session, elapsedMs: this.elapsed(now), remainingMs: Math.max(0, this.session.planMs - this.elapsed(now)) } : null });
    }
    export(now = Date.now()) {
      return copy({ version: 2, preferences: this.preferences, notes: this.notes, history: this.history, completedSessions: this.completedSessions, decks: this.decks, lastQuotes: this.lastQuotes, session: this.session ? { ...this.session, elapsedMs: this.elapsed(now), segmentStartedAt: now } : null });
    }
  }
  const api = { FocusCompanion, defaults, MINUTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MischiefFocus = api;
})(typeof window !== 'undefined' ? window : globalThis);
