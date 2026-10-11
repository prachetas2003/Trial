const root = document.querySelector('#focus-desk');
const api = window.companion;
const arrow = '<svg class="desk-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
root.innerHTML = `
  <header class="desk-heading"><div><span class="desk-eyebrow">MISCHIEF · YOUR LITTLE CORNER</span><h1>One thing at a time<span>.</span></h1></div><button type="button" class="close-desk" aria-label="Back to my work">${arrow}</button></header>
  <p class="desk-intro">Make room for what matters. Leave the other thoughts with me.</p>
  <p id="save-warning" class="save-warning" role="status" hidden></p>
  <section class="mode-card" aria-label="Focus modes"><div class="section-heading"><h2>Choose your setup</h2><span id="mode-label">Custom</span></div><div class="mode-buttons"><button type="button" data-mode="companion"><strong>Companion</strong><small>Monkey · gentle quotes</small></button><button type="button" data-mode="deep"><strong>Deep Focus</strong><small>Blocking · quiet monkey · glow</small></button><button type="button" data-mode="blocker"><strong>Blocker Only</strong><small>Blocking · nothing on screen</small></button></div><p class="quiet-copy">Modes apply a set of settings now. Adjust any feature below.</p></section>
  <section class="focus-card" aria-label="Focus timer">
    <div class="timer-heading"><span id="timer-label">A little room to focus</span><span id="timer-state" class="timer-state">READY WHEN YOU ARE</span></div>
    <div class="timer-face"><svg viewBox="0 0 180 180" aria-hidden="true"><circle class="ring-track" cx="90" cy="90" r="80"/><circle id="timer-ring" cx="90" cy="90" r="80"/></svg><div><output id="timer-clock" aria-label="Time remaining">25:00</output><span id="timer-subtitle">a fresh start</span></div></div>
    <form id="start-form"><label for="intention">What do you want to make room for?</label><input id="intention" maxlength="160" placeholder="One small thing I want to move forward…" autocomplete="off"><div class="start-options"><label>Focus <span><input id="focus-minutes" type="number" min="1" max="180" value="25" required> min</span></label><label>Break <span><input id="break-minutes" type="number" min="1" max="60" value="5" required> min</span></label></div><button class="primary-action" type="submit">Start my focus session <span>→</span></button></form>
    <div id="session-controls" hidden><p id="session-intention"></p><div class="session-actions"><button id="session-pause" type="button">Pause timer</button><button id="session-end" type="button">Finish session</button></div></div>
    <p id="recovery" class="quiet-copy" hidden>Your saved timer is paused. Resume when you’re ready.</p>
    <div class="choice-area"><button id="stay-button" type="button" disabled><span class="choice-spark" aria-hidden="true">✧</span><span>I’m staying<small>Feel the pull elsewhere? Choose your next step.</small></span><span class="choice-count" id="choice-count">0</span></button><p class="shortcut-copy">Desktop shortcut: Ctrl + Alt + S</p></div>
    <p id="desk-feedback" role="status" class="desk-feedback"></p>
  </section>
  <section id="session-summary" class="summary-card" aria-label="Your session summary" hidden><span class="desk-eyebrow">THIS WAS YOUR CHOICE</span><h2 id="summary-title"></h2><p id="summary-intention"></p><div class="summary-numbers"><div><strong id="summary-time"></strong><span>session time</span></div><div><strong id="summary-choices"></strong><span>choices to stay</span></div></div><div id="choice-marks" aria-hidden="true"></div><p id="summary-message"></p><button id="start-break" type="button">Take a break →</button><p class="quiet-copy">Every fourth completed session gets a longer break. The next session starts when you choose.</p></section>
  <section class="shield-card" aria-label="Focus Shield"><div class="section-heading"><h2>Focus Shield</h2><label class="shield-switch"><input id="shield-enabled" type="checkbox"> Enable</label></div><p id="browser-status" role="status" class="connection-status">Browser extension not connected</p><p class="quiet-copy">Blocks only during a running focus session. Pause, finish, or quit to unlock.</p><details id="shield-setup"><summary>Connect your browser</summary><div class="setup-content"><p class="quiet-copy">Chrome or Edge · one-time setup for each browser profile. Private windows need separate extension permission.</p><ol><li><button type="button" id="extension-folder">Open extension folder</button></li><li>Open <strong>chrome://extensions</strong> or <strong>edge://extensions</strong>. Enable Developer mode, choose <strong>Load unpacked</strong>, and select the <strong>FocusShield</strong> folder.</li><li>Open the extension from your browser toolbar and paste this pairing code.</li></ol><div class="pairing-row"><input id="pairing-code" readonly aria-label="Browser pairing code"><button id="copy-pairing" type="button">Copy</button></div><p id="preview-shield-note" class="quiet-copy" hidden>The website demonstrates the controls. Install the Windows app and extension to block real browser tabs.</p></div></details><details id="shield-rules"><summary>Websites &amp; features <span id="rule-count"></span></summary><div class="shield-fields"><form id="website-form"><label for="website-input">Add a website to block</label><div class="website-row"><input id="website-input" placeholder="reddit.com" maxlength="250" required><button type="submit">Add</button></div></form><ul id="website-list"></ul><label class="check-preference"><input type="checkbox" id="block-shorts"> YouTube Shorts <small>Keep regular videos available</small></label><label class="check-preference"><input type="checkbox" id="block-reels"> Instagram Reels</label></div></details><details id="shield-tabs"><summary>Tabs &amp; workspace <span id="tab-count"></span></summary><div class="shield-fields"><label class="check-preference"><input type="checkbox" id="only-work-tabs"> Only my work tabs</label><p class="quiet-copy">With this on, only tabs marked Work are available. New tabs are locked until you add them here. Website and feature blocks still apply inside work tabs.</p><p id="tab-empty" class="quiet-copy">Connect your extension to select open tabs.</p><ul id="browser-tabs"></ul><p class="quiet-copy">Lock covers a page without closing it. Browser settings and other protected browser pages cannot be covered. Refresh your work-tab selection after restarting the browser.</p></div></details></section>
  <section class="thought-card" aria-label="Keep my thoughts"><div class="section-heading"><h2>Keep my thoughts<span>✎</span></h2><span id="thought-count">0 saved</span></div><p class="quiet-copy">Put it here. It will still be here after your session.</p><form id="thought-form"><label class="visually-hidden" for="thought-input">A thought for later</label><textarea id="thought-input" maxlength="1000" rows="2" placeholder="Look something up, send a message, an idea for later…" required></textarea><button type="submit">Keep this for later <span>${arrow}</span></button></form><ul id="thought-list"></ul><p id="thought-empty" class="empty-copy">Nothing to carry right now.</p><details id="done-thoughts"><summary>Thoughts I’ve returned to <span id="done-count"></span></summary><ul id="done-list"></ul></details></section>
  <details class="preferences-card"><summary>Customize individually <span>＋</span></summary><div class="custom-groups">
    <details open><summary>Monkey &amp; quotes</summary><div class="preference-fields"><label>Monkey on my screen<select id="presence"><option value="wander">Wander freely</option><option value="peek">Peek from the edge</option><option value="hidden">Completely hidden</option></select></label><label class="check-preference"><input id="quotes-enabled" type="checkbox" checked> Show monkey quotes <small>Off means no speech, including encouragement</small></label><label class="check-preference"><input id="auto-quotes" type="checkbox" checked> Automatic warm quotes</label><label>Quote frequency<select id="quote-seconds"><option value="12">Every 12 seconds</option><option value="25">Every 25 seconds</option><option value="45">Every 45 seconds</option><option value="90">Every 90 seconds</option></select></label><label class="check-preference"><input id="quiet-focus" type="checkbox"> Keep ordinary quotes quiet during focus</label><label class="check-preference"><input id="peek-focus" type="checkbox" checked> Tuck to the edge during focus</label><label class="check-preference"><input id="return-session" type="checkbox" checked> Bring monkey back after focus</label><button id="encourage" type="button">A little encouragement ✧</button></div></details>
    <details open><summary>Screen &amp; sound</summary><div class="preference-fields"><label class="check-preference"><input id="show-hud" type="checkbox" checked> Show timer bar on screen</label><label class="check-preference"><input id="vignette" type="checkbox"> Soft amber focus edges</label><p class="quiet-copy">Edges glow once at session start, then stay still. All glow remains click-through.</p><label class="check-preference"><input id="completion-sound" type="checkbox" checked> A soft sound when the timer ends</label><p class="quiet-copy">When everything is hidden, use the tray icon or Ctrl + Alt + F to open this panel. Ctrl + Alt + Q quits.</p></div></details>
    <details><summary>Movement &amp; appearance</summary><div class="preference-fields"><label>Marker ink<select id="marker-ink"><option value="black">Black · light screens</option><option value="white">White · dark screens</option></select></label><label class="check-preference"><input id="drag-enabled" type="checkbox" checked> Let me click and drag the monkey</label><label class="check-preference"><input id="chase-cursor" type="checkbox"> Keep chasing my cursor</label></div></details>
    <details><summary>Breaks</summary><div class="preference-fields"><label>Long break <span><input id="long-break-minutes" type="number" min="1" max="60" value="15"> min</span></label></div></details>
  </div></details>
  <details class="history-card"><summary>My recent sessions <span id="history-count"></span></summary><ol id="history-list"></ol></details>
  <footer class="desk-footer">Your thoughts and sessions stay on this device.<br><span>No account. Just you and a little monkey.</span></footer>`;

const el = id => root.querySelector(`#${id}`);
let current, lastPrefs = '', lastNotes = '', lastHistory = '', feedbackUntil = 0;
const time = ms => { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
function feedback(message) { el('desk-feedback').textContent = message; feedbackUntil = Date.now() + 6000; }
async function act(action) {
  try {
    const result = await api.focusAction(action);
    if (result?.error) { feedback(result.error); return false; }
    if (result?.state) render(result.state);
    return true;
  } catch { feedback('That change could not be made. Please try again.'); return false; }
}
function thoughtRow(note) {
  const li = document.createElement('li'); li.className = 'thought-row';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'thought-check'; toggle.textContent = note.done ? '✓' : '○';
  toggle.setAttribute('aria-label', note.done ? 'Keep this thought for later again' : 'Mark this thought as returned to'); toggle.addEventListener('click', () => act({ type: 'note-toggle', id: note.id }));
  const text = document.createElement('span'); text.textContent = note.text;
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'thought-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Remove this thought'); remove.addEventListener('click', () => act({ type: 'note-delete', id: note.id }));
  li.append(toggle, text, remove); return li;
}
function render(state) {
  current = state;
  const { preferences: p, session: s, history, notes } = state;
  el('save-warning').hidden = !state.saveError; el('save-warning').textContent = state.saveError || '';
  const prefKey = JSON.stringify([p, state.ink, state.presence]);
  if (prefKey !== lastPrefs) {
    lastPrefs = prefKey;
    for (const [id, value] of [['focus-minutes', p.focusMinutes], ['break-minutes', p.breakMinutes], ['long-break-minutes', p.longBreakMinutes], ['presence', state.presence || p.presence], ['quote-seconds', p.quoteSeconds], ['marker-ink', state.ink || 'black']]) if (document.activeElement !== el(id)) el(id).value = value;
    for (const [id, value] of [['peek-focus', p.peekDuringFocus], ['auto-quotes', p.autoQuotes], ['quiet-focus', p.quietFocus], ['drag-enabled', p.dragEnabled], ['chase-cursor', p.chaseCursor], ['completion-sound', p.completionSound], ['return-session', p.returnAfterSession], ['quotes-enabled', p.quotesEnabled], ['show-hud', p.showHud], ['vignette', p.vignette]]) el(id).checked = value;
  }
  renderShield(state);
  el('encourage').disabled = !p.quotesEnabled;
  el('quote-seconds').disabled = !p.quotesEnabled || !p.autoQuotes;
  el('start-form').hidden = !!s; el('session-controls').hidden = !s;
  el('timer-clock').textContent = time(s ? s.remainingMs : p.focusMinutes * 60000);
  el('timer-label').textContent = s?.kind === 'break' ? 'A little breathing room' : 'A little room to focus';
  el('timer-state').textContent = !s ? 'READY WHEN YOU ARE' : s.running ? s.kind === 'focus' ? 'ONE THING AT A TIME' : 'TAKE YOUR TIME' : 'PAUSED';
  el('timer-subtitle').textContent = !s ? 'a fresh start' : s.kind === 'break' ? 'nothing to prove' : s.running ? 'this moment is yours' : 'ready when you are';
  el('timer-ring').style.strokeDashoffset = String(502.655 * (s ? s.elapsedMs / s.planMs : 0));
  el('session-intention').textContent = s?.intention || (s?.kind === 'break' ? 'Step away. Stretch. Let the work breathe.' : 'A little time for what you chose.');
  el('session-pause').textContent = s?.running ? 'Pause timer' : 'Resume timer';
  el('session-end').textContent = s?.kind === 'break' ? 'End break' : 'Finish session';
  el('recovery').hidden = !state.recovered;
  el('stay-button').disabled = !s?.running || s.kind !== 'focus' || (s.lastChoiceAt !== null && Date.now() - s.lastChoiceAt < 2000);
  el('choice-count').textContent = String(s?.choices || 0);
  if (Date.now() > feedbackUntil) el('desk-feedback').textContent = '';
  const recent = history[0]; el('session-summary').hidden = !!s || !recent;
  if (recent) {
    el('summary-title').textContent = recent.completed ? 'A little further than before.' : 'You made room for your work.';
    el('summary-intention').textContent = recent.intention;
    el('summary-time').textContent = time(recent.elapsedMs);
    el('summary-choices').textContent = String(recent.choices);
    el('choice-marks').textContent = '✦ '.repeat(Math.min(recent.choices, 12)) + (recent.choices > 12 ? `+${recent.choices - 12}` : '');
    el('summary-message').textContent = recent.choices ? `${recent.choices} ${recent.choices === 1 ? 'time, you recorded a choice' : 'times, you recorded a choice'} to stay. Every one was yours.` : 'You chose to make space for something that matters to you.';
  }
  const notesKey = JSON.stringify(notes);
  if (lastNotes !== notesKey) {
    lastNotes = notesKey; const pending = notes.filter(n => !n.done), done = notes.filter(n => n.done);
    el('thought-count').textContent = `${pending.length} saved`; el('thought-empty').hidden = pending.length > 0;
    el('thought-list').replaceChildren(...pending.map(thoughtRow)); el('done-list').replaceChildren(...done.map(thoughtRow));
    el('done-count').textContent = String(done.length); el('done-thoughts').hidden = !done.length;
  }
  const historyKey = JSON.stringify(history);
  if (lastHistory !== historyKey) {
    lastHistory = historyKey; el('history-count').textContent = String(history.length);
    el('history-list').replaceChildren(...history.map(h => {
      const li = document.createElement('li'), title = document.createElement('strong'), detail = document.createElement('span');
      title.textContent = h.intention || 'Time for my work'; detail.textContent = `${new Date(h.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time(h.elapsedMs)} · ${h.choices} ${h.choices === 1 ? 'choice' : 'choices'} · ${h.completed ? 'timer complete' : 'finished early'}`;
      li.append(title, detail); return li;
    }));
  }
}
let lastTabKey = '', lastSites = '';
function renderShield(state) {
  const p = state.preferences, shield = p.shield, browser = state.browser || { connected: false, tabs: [] };
  let mode = 'Custom';
  for (const [name, values] of Object.entries(window.MischiefFocus.presets)) {
    const matches = Object.entries(values).every(([key, value]) => key === 'shieldEnabled' ? shield.enabled === value : p[key] === value);
    root.querySelector(`[data-mode="${name}"]`).setAttribute('aria-pressed', String(matches));
    if (matches) mode = { companion: 'Companion', deep: 'Deep Focus', blocker: 'Blocker Only' }[name];
  }
  el('mode-label').textContent = mode;
  el('shield-enabled').checked = shield.enabled;
  el('only-work-tabs').checked = shield.onlyWorkTabs;
  el('block-shorts').checked = shield.features.shorts; el('block-reels').checked = shield.features.reels;
  const active = shield.enabled && state.session?.running && state.session.kind === 'focus';
  el('browser-status').textContent = browser.preview ? 'Preview only · real blocking needs the app + extension' : browser.error || (!browser.connected ? 'Not connected · connect the browser extension' : `${active ? browser.enforced ? 'Blocking active' : 'Connected · applying restrictions…' : 'Connected · blocking ready'} · ${browser.clients?.map(c => c.name).join(', ') || 'browser'}`);
  el('browser-status').dataset.connected = String(browser.connected);
  el('pairing-code').value = browser.pairingCode || '';
  el('copy-pairing').disabled = !browser.pairingCode;
  el('extension-folder').disabled = !!browser.preview;
  el('preview-shield-note').hidden = !browser.preview;
  el('rule-count').textContent = `${shield.websites.length + Number(shield.features.shorts) + Number(shield.features.reels)} selected`;
  el('tab-count').textContent = `${shield.workTabs.length} work · ${shield.lockedTabs.length} locked`;
  const sites = JSON.stringify(shield.websites);
  if (sites !== lastSites) {
    lastSites = sites;
    el('website-list').replaceChildren(...shield.websites.map(site => {
      const li = document.createElement('li'), text = document.createElement('span'), remove = document.createElement('button');
      text.textContent = site; remove.type = 'button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${site}`);
      remove.onclick = () => act({ type: 'shield', values: { websites: current.preferences.shield.websites.filter(v => v !== site) } });
      li.append(text, remove); return li;
    }));
  }
  const tabs = browser.tabs || [], tabKey = JSON.stringify([tabs, shield.workTabs, shield.lockedTabs]);
  el('tab-empty').hidden = tabs.length > 0;
  if (tabKey !== lastTabKey) {
    lastTabKey = tabKey;
    el('browser-tabs').replaceChildren(...tabs.map(tab => {
      const li = document.createElement('li'), text = document.createElement('div'), title = document.createElement('strong'), url = document.createElement('small'), choices = document.createElement('div');
      title.textContent = tab.title; url.textContent = tab.url; text.append(title, url); choices.className = 'tab-options';
      for (const [field, label] of [['workTabs', 'Work'], ['lockedTabs', 'Lock']]) {
        const item = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = shield[field].includes(tab.key); input.setAttribute('aria-label', `${label}: ${tab.title}`);
        input.onchange = () => { const p = current.preferences.shield, opposite = field === 'workTabs' ? 'lockedTabs' : 'workTabs'; act({ type: 'shield', values: { [field]: input.checked ? [...p[field], tab.key] : p[field].filter(v => v !== tab.key), ...(input.checked ? { [opposite]: p[opposite].filter(v => v !== tab.key) } : {}) } }); };
        item.append(input, document.createTextNode(label)); choices.append(item);
      }
      li.append(text, choices); return li;
    }));
  }
}
for (const button of root.querySelectorAll('[data-mode]')) button.onclick = () => act({ type: 'preset', name: button.dataset.mode });
el('shield-enabled').onchange = () => act({ type: 'shield', values: { enabled: el('shield-enabled').checked } });
el('only-work-tabs').onchange = () => act({ type: 'shield', values: { onlyWorkTabs: el('only-work-tabs').checked } });
for (const [id, key] of [['block-shorts', 'shorts'], ['block-reels', 'reels']]) el(id).onchange = () => act({ type: 'shield', values: { features: { [key]: el(id).checked } } });
el('website-form').onsubmit = async event => { event.preventDefault(); if (await act({ type: 'shield', values: { websites: [...current.preferences.shield.websites, el('website-input').value] } })) el('website-input').value = ''; };
el('extension-folder').onclick = () => act({ type: 'browser-folder' });
el('copy-pairing').onclick = async () => { if (await act({ type: 'copy-pairing' })) feedback('Pairing code copied. Paste it in your browser extension.'); };
el('start-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!await act({ type: 'preferences', values: { focusMinutes: Number(el('focus-minutes').value), breakMinutes: Number(el('break-minutes').value) } })) return;
  if (await act({ type: 'start', intention: el('intention').value })) feedback('Your timer is running. You can return to your work.');
});
el('session-pause').addEventListener('click', () => act({ type: current.session?.running ? 'pause' : 'resume' }));
el('session-end').addEventListener('click', () => act({ type: 'end' }));
el('stay-button').addEventListener('click', async () => { if (await act({ type: 'stay' })) feedback('Choice recorded. Your next step is yours.'); });
el('start-break').addEventListener('click', () => act({ type: 'start', kind: 'break' }));
el('thought-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (await act({ type: 'note-add', text: el('thought-input').value })) { el('thought-input').value = ''; feedback('Kept for later.'); }
});
el('thought-input').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); el('thought-form').requestSubmit(); } });
for (const [id, key, check] of [['focus-minutes', 'focusMinutes'], ['break-minutes', 'breakMinutes'], ['long-break-minutes', 'longBreakMinutes'], ['quote-seconds', 'quoteSeconds'], ['peek-focus', 'peekDuringFocus', true], ['auto-quotes', 'autoQuotes', true], ['quiet-focus', 'quietFocus', true], ['drag-enabled', 'dragEnabled', true], ['completion-sound', 'completionSound', true], ['return-session', 'returnAfterSession', true], ['quotes-enabled', 'quotesEnabled', true], ['show-hud', 'showHud', true], ['vignette', 'vignette', true]]) {
  el(id).addEventListener('change', () => { if (el(id).checkValidity()) act({ type: 'preferences', values: { [key]: check ? el(id).checked : id === 'presence' ? el(id).value : Number(el(id).value) } }); });
}
el('presence').addEventListener('change', () => act({ type: 'presence', value: el('presence').value }));
el('chase-cursor').addEventListener('change', () => act({ type: 'chase', enabled: el('chase-cursor').checked }));
el('marker-ink').addEventListener('change', () => act({ type: 'appearance', ink: el('marker-ink').value }));
el('encourage').addEventListener('click', () => act({ type: 'quote', category: 'hard' }));
root.querySelector('.close-desk').addEventListener('click', () => api.hideFocus());
api.onFocusState(render);
api.onFocusView?.(view => { if (view === 'summary') el('session-summary').scrollIntoView({ block: 'center', behavior: 'instant' }); if (view === 'thought') { el('thought-input').scrollIntoView({ block: 'center', behavior: 'instant' }); el('thought-input').focus(); } });
render(await api.getFocusState());
