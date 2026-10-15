const root = document.querySelector('#focus-desk');
const api = window.companion;
const arrow = '<svg class="desk-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
root.innerHTML = `
  <header class="desk-heading"><div><span class="desk-eyebrow">MISCHIEF · YOUR LITTLE CORNER</span><h1>One thing at a time<span>.</span></h1></div><button type="button" class="close-desk" aria-label="Back to my work">${arrow}</button></header>
  <p class="desk-intro">Focus = timer & presets · Blocking = websites & tabs · Appearance = monkey, bubbles & edges · Notes = thoughts for later.</p>
  <p id="save-warning" class="save-warning" role="status" hidden></p>
  <div class="quick-switches" aria-label="On-screen controls"><label><input id="quick-monkey" type="checkbox"> Monkey</label><label><input id="quotes-enabled" type="checkbox"> Quotes</label><label title="Show or hide the top-screen timer"><input id="show-hud" type="checkbox"> Timer bar</label><label><input id="vignette" type="checkbox"> Edges</label></div>
  <p id="quotes-status" class="quiet-copy quote-status" role="status"></p>
  <nav class="desk-tabs" aria-label="Focus corner sections"><button type="button" data-desk-tab="focus" aria-pressed="true">Focus</button><button type="button" data-desk-tab="blocking" aria-pressed="false">Blocking</button><button type="button" data-desk-tab="appearance" aria-pressed="false">Appearance</button><button type="button" data-desk-tab="notes" aria-pressed="false">Notes</button></nav>
  <p id="desk-feedback" role="status" class="desk-feedback"></p>
  <div id="focus-view">
  <section class="mode-card" aria-label="Focus modes"><div class="section-heading"><h2>Start with a preset</h2><span id="mode-label">Custom</span></div><div class="mode-buttons"><button type="button" data-mode="companion"><strong>Companion</strong><small>Monkey · gentle quotes</small></button><button type="button" data-mode="deep"><strong>Deep Focus</strong><small>Blocking · quiet monkey · edges</small></button><button type="button" data-mode="blocker"><strong>Blocker Only</strong><small>Blocking · nothing on screen</small></button></div><p class="quiet-copy">Presets choose a complete setup in one click. Want something different? Adjust the switches or visit Appearance and Blocking to make your own Custom setup.</p></section>
  <button id="choose-blocking" type="button">Choose tabs &amp; sites <span id="blocking-summary"></span></button>
  <section class="focus-card" aria-label="Focus timer">
    <div class="timer-heading"><span id="timer-label">Focus session timer</span><span id="timer-state" class="timer-state">READY WHEN YOU ARE</span></div>
    <div class="timer-face"><svg viewBox="0 0 180 180" aria-hidden="true"><circle class="ring-track" cx="90" cy="90" r="80"/><circle id="timer-ring" cx="90" cy="90" r="80"/></svg><div><output id="timer-clock" aria-label="Time remaining">25:00</output><span id="timer-subtitle">a fresh start</span></div></div>
    <form id="start-form"><label for="intention">What do you want to make room for?</label><input id="intention" maxlength="160" placeholder="One small thing I want to move forward…" autocomplete="off"><div class="start-options"><label>Focus <span><input id="focus-minutes" type="number" min="1" max="180" value="25" required> min</span></label><label>Break <span><input id="break-minutes" type="number" min="1" max="60" value="5" required> min</span></label></div><button class="primary-action" type="submit">Start my focus session <span>→</span></button></form>
    <div id="session-controls" hidden><p id="session-intention"></p><div class="session-actions"><button id="session-pause" type="button">Pause timer</button><button id="session-end" type="button">Finish session</button></div></div>
    <p id="recovery" class="quiet-copy" hidden>Your saved timer is paused. Resume when you’re ready.</p>
    <div class="choice-area"><button id="stay-button" type="button" disabled><span class="choice-spark" aria-hidden="true">✧</span><span>I’m staying<small>Feel the pull elsewhere? Choose your next step.</small></span><span class="choice-count" id="choice-count">0</span></button><p class="shortcut-copy">Desktop shortcut: Ctrl + Alt + S</p></div>
  </section>
  <section id="session-summary" class="summary-card" aria-label="Your session summary" hidden><span class="desk-eyebrow">THIS WAS YOUR CHOICE</span><h2 id="summary-title"></h2><p id="summary-intention"></p><div class="summary-numbers"><div><strong id="summary-time"></strong><span>session time</span></div><div><strong id="summary-choices"></strong><span>choices to stay</span></div></div><div id="choice-marks" aria-hidden="true"></div><p id="summary-message"></p><button id="start-break" type="button">Take a break →</button><p class="quiet-copy">Every fourth completed session gets a longer break. The next session starts when you choose.</p></section>

  </div>
  <section id="blocking-view" hidden>
  <section class="shield-card" aria-label="Focus Shield"><div class="section-heading"><h2>Focus Shield</h2><label class="shield-switch"><input id="shield-enabled" type="checkbox"> Enable</label></div><p id="browser-status" role="status" class="connection-status">Browser extension not connected</p><p class="quiet-copy">Blocks only during a running focus session. Pause, finish, or quit to unlock.</p><details id="shield-setup"><summary>Connect your browser</summary><div class="setup-content"><p class="quiet-copy">Chrome or Edge · one-time setup for each browser profile. Private windows need separate extension permission.</p><ol><li>In Chrome, go to <strong>chrome://extensions</strong>. In Edge, go to <strong>edge://extensions</strong>.</li><li>Turn on <strong>Developer mode</strong>.</li><li>Click <strong>Load unpacked</strong>.</li><li>Browse to the folder where you extracted this app. Select its <strong>FocusShield</strong> folder, then click <strong>Select Folder</strong>.</li><li>Open FocusShield from your browser’s Extensions button. Paste the pairing code below and click <strong>Connect browser</strong>.</li></ol><button type="button" id="extension-folder">Optional: find my app’s extension folder</button><div class="pairing-row"><input id="pairing-code" readonly aria-label="Browser pairing code"><button id="copy-pairing" type="button">Copy</button></div><p id="preview-shield-note" class="quiet-copy" hidden>The website demonstrates the controls. Install the Windows app and extension to block real browser tabs.</p></div></details><section id="shield-rules"><div class="section-heading"><h3>Websites &amp; features</h3><span id="rule-count"></span></div><div class="shield-fields"><form id="website-form"><label for="website-input">Add a website to block</label><div class="website-row"><input id="website-input" placeholder="reddit.com" maxlength="250" required><button type="submit">Add</button></div></form><ul id="website-list"></ul><label class="check-preference"><input type="checkbox" id="block-shorts"> YouTube Shorts <small>Keep regular videos available</small></label><label class="check-preference"><input type="checkbox" id="block-reels"> Instagram Reels</label></div></section><section id="shield-tabs"><div class="section-heading"><h3>Tabs &amp; workspace</h3><span id="tab-count"></span></div><div class="shield-fields"><label class="tab-policy-label">Tab access<select id="tab-policy"><option value="blocked">Block selected tabs</option><option value="work">Only selected work tabs</option></select></label><label class="check-preference" id="work-site-option"><input type="checkbox" id="restrict-work-sites"> Keep work tabs on their approved websites</label><p id="workspace-help" class="quiet-copy"></p><p id="tab-empty" class="quiet-copy">Connect your extension to select open tabs.</p><ul id="browser-tabs"></ul><p class="quiet-copy">Lock covers a page without closing it. Browser settings and other protected browser pages cannot be covered. Refresh your work-tab selection after restarting the browser.</p></div></section></section>
  </section>
  <section id="appearance-view" class="appearance-card" aria-label="Appearance controls" hidden><div class="section-heading"><h2>Make it feel right</h2><button id="reset-appearance" type="button">Reset</button></div><p class="quiet-copy">Changes preview and save as you adjust. Use the switches above to show or hide each feature.</p>
    <div class="adjustment"><label for="timer-opacity">Timer background <output id="timer-opacity-value"></output></label><input id="timer-opacity" type="range" min="15" max="100" step="1"><div class="range-ends"><span>Clear</span><span>Solid</span></div><p class="quiet-copy">Numbers stay readable. Hover over the timer for a clearer background.</p></div>
    <div class="adjustment"><label for="monkey-size">Monkey size <output id="monkey-size-value"></output></label><input id="monkey-size" type="range" min="60" max="100" step="1"><div class="range-ends"><span>Small</span><span>Original</span></div><label>Monkey on my screen<select id="presence"><option value="wander">Wander freely</option><option value="peek">Peek from the edge</option><option value="hidden">Completely hidden</option></select></label></div>
    <div class="adjustment"><label for="screen-style">Screen style<select id="screen-style"><option value="auto">Auto · match my setup</option><option value="light">Light workspace</option><option value="dark">Dark workspace</option></select></label><label for="glow-intensity">Focus edge strength <output id="glow-intensity-value"></output></label><input id="glow-intensity" type="range" min="0" max="100" step="1"><div class="range-ends"><span>Subtle</span><span>Strong</span></div><label for="edge-coverage">Focus edge coverage <output id="edge-coverage-value"></output></label><input id="edge-coverage" type="range" min="64" max="280" step="1"><div class="range-ends"><span>Narrow</span><span>Wide scope</span></div><div id="glow-preview" aria-label="Focus edge preview"></div><p class="quiet-copy">A still, neutral shadow at the edges during focus. The centre stays clear. Auto uses your system theme or white-marker setting. Choose Light or Dark to match the workspace in front of you. Speech bubbles use the same style.</p></div>
    <div class="preference-fields"><label class="check-preference"><input id="celebrations" type="checkbox"> Celebrate progress &amp; completed sessions <small>Small bursts at 25%, 50%, 75%; brief screen celebration at completion</small></label><label class="check-preference"><input id="completion-sound" type="checkbox"> A soft sound when the timer ends</label><label>Marker ink<select id="marker-ink"><option value="black">Black · light screens</option><option value="white">White · dark screens</option></select></label><label>Quote frequency<select id="quote-seconds"><option value="12">Every 12 seconds</option><option value="25">Every 25 seconds</option><option value="45">Every 45 seconds</option><option value="90">Every 90 seconds</option></select></label><button id="encourage" type="button">A little encouragement ✧</button></div>
    <details class="preferences-card"><summary>More behaviour options</summary><div class="preference-fields"><label class="check-preference"><input id="auto-quotes" type="checkbox"> Automatic warm quotes</label><label class="check-preference"><input id="quiet-focus" type="checkbox"> Keep ordinary quotes quiet during focus</label><label class="check-preference"><input id="peek-focus" type="checkbox"> Tuck to the edge during focus</label><label class="check-preference"><input id="return-session" type="checkbox"> Bring monkey back after focus</label><label class="check-preference"><input id="drag-enabled" type="checkbox"> Let me click and drag the monkey</label><label class="check-preference"><input id="chase-cursor" type="checkbox"> Keep chasing my cursor</label><label>Long break <span><input id="long-break-minutes" type="number" min="1" max="60"> min</span></label></div></details><p class="quiet-copy">Everything hidden? Use the tray’s Show timer / Show monkey controls, or Ctrl + Alt + F to open this panel.</p>
  </section>
  <section id="notes-view" hidden>
  <section class="thought-card" aria-label="Keep my thoughts"><div class="section-heading"><h2>Keep my thoughts<span>✎</span></h2><span id="thought-count">0 saved</span></div><p class="quiet-copy">Put it here. It will still be here after your session.</p><form id="thought-form"><label class="visually-hidden" for="thought-input">A thought for later</label><textarea id="thought-input" maxlength="1000" rows="2" placeholder="Look something up, send a message, an idea for later…" required></textarea><button type="submit">Keep this for later <span>${arrow}</span></button></form><ul id="thought-list"></ul><p id="thought-empty" class="empty-copy">Nothing to carry right now.</p><details id="done-thoughts"><summary>Thoughts I’ve returned to <span id="done-count"></span></summary><ul id="done-list"></ul></details></section>
  <details class="history-card"><summary>My recent sessions <span id="history-count"></span></summary><ol id="history-list"></ol></details>
  </section>
  <footer class="desk-footer">Your thoughts and sessions stay on this device.<br><span>No account. Just you and a little monkey.</span></footer>`;

// Category navigation stays above the content and all frequently used controls.
const nav=root.querySelector('.desk-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Settings categories');
nav.innerHTML=[['focus','Focus timer'],['blocking','Websites & tabs'],['monkey','Monkey'],['appearance','Appearance'],['notes','Notes & history']].map(([id,label],i)=>`<button type="button" role="tab" id="tab-${id}" data-desk-tab="${id}" aria-controls="${id}-view" aria-selected="${i===0}" aria-pressed="${i===0}" tabindex="${i===0?0:-1}">${label}</button>`).join('');
root.querySelector('.desk-heading').after(nav);
root.querySelector('.desk-heading h1').textContent='Mischief';
root.querySelector('.desk-eyebrow').textContent='YOUR DESKTOP COMPANION';
root.querySelector('.desk-intro').textContent='Start a timer, choose what stays on screen, and make room for your work.';
root.querySelector('.quick-switches').setAttribute('aria-label','Quick visibility switches');
const monkey=document.createElement('section');monkey.id='monkey-view';monkey.hidden=true;monkey.innerHTML=`<header class="category-heading"><span class="desk-eyebrow">MONKEY</span><h2>Your little screen companion</h2><p>Movement, encouragement, and a little hands-on play. Nothing demands your attention.</p></header><div id="monkey-controls" class="settings-group"></div><section class="play-card"><div class="section-heading"><h3>Play with Mischief</h3><label class="check-preference"><input id="play-enabled" type="checkbox"> Play interactions</label></div><p class="quiet-copy">Keep click-and-drag on below. Play happens only when you reach for him. Switch Play off for ordinary dragging.</p><ol class="play-guide"><li><strong>Pick up & dangle</strong><span>Grab his head, or drag his body. Paws and tail follow your hand with a little weight.</span></li><li><strong>Squish & release</strong><span>Press and hold his shirt without moving. Let go for a soft rebound.</span></li><li><strong>Tail spring</strong><span>Grab the curled tail, pull gently, then release.</span></li><li><strong>Marker sheen</strong><span>Stroke back and forth across him. The ink catches the light as he relaxes.</span></li><li><strong>Gentle toss</strong><span>Move a held monkey, then release. A short tumble settles safely inside the screen. Edge peeking and reduced motion keep him settled.</span></li></ol></section><section id="monkey-behaviour" class="settings-group"><h3>Movement & focus behaviour</h3></section><section id="monkey-quotes" class="settings-group"><h3>Encouragement</h3></section>`;
root.querySelector('#appearance-view').before(monkey);
const find=id=>root.querySelector('#'+id),move=(id,target)=>{const e=find(id);target.append(e.closest('label')||e);};
find('monkey-controls').append(find('monkey-size').closest('.adjustment'));
move('marker-ink',find('monkey-controls'));
for(const id of ['drag-enabled','chase-cursor','peek-focus','return-session'])move(id,find('monkey-behaviour'));
for(const id of ['auto-quotes','quiet-focus','quote-seconds'])move(id,find('monkey-quotes'));
find('monkey-quotes').append(find('quotes-status'),find('encourage'));
// Break options belong beside the timer; notes and history have their own destination.
const breakOptions=document.createElement('div');breakOptions.className='break-options';move('long-break-minutes',breakOptions);find('focus-view').append(breakOptions);
root.querySelector('.preferences-card').remove();
const focusView=find('focus-view');focusView.prepend(root.querySelector('.focus-card'));
const quickSetups=root.querySelector('.mode-card');quickSetups.querySelector('h2').textContent='Quick setups';quickSetups.querySelector('.quiet-copy').textContent='Presets apply a complete setup. Adjust any switch or category to make your own Custom setup.';
root.querySelector('[data-mode=deep] small').textContent='Browser rules · quiet monkey';root.querySelector('[data-mode=blocker] strong').textContent='Browser rules only';root.querySelector('[data-mode=blocker] small').textContent='No monkey, timer bar or effects';
const timerOptions=find('timer-opacity').closest('.adjustment');timerOptions.insertAdjacentHTML('beforeend','<label class="check-preference"><input id="timer-locked" type="checkbox"> Lock timer position</label><p class="quiet-copy">Drag the dotted grip on the floating timer. The padlock button locks or unlocks it. Position is remembered.</p><button id="reset-timer" type="button">Reset timer position</button>');
find('reset-appearance').textContent='Reset appearance';
root.querySelector('#blocking-view h2').textContent='Websites & tabs';find('shield-enabled').parentElement.lastChild.textContent=' Use browser rules';
find('website-form').querySelector('button').textContent='Block website';
find('block-shorts').parentElement.childNodes[1].textContent=' Hide YouTube Shorts ';find('block-reels').parentElement.childNodes[1].textContent=' Hide Instagram Reels';
for(const [id,label]of [['focus','Focus timer'],['blocking','Websites & tabs'],['monkey','Monkey'],['appearance','Appearance'],['notes','Notes & history']]){find(id+'-view').setAttribute('role','tabpanel');find(id+'-view').setAttribute('aria-labelledby','tab-'+id);}

const elements = new Map();
const el = id => { if (!elements.has(id)) elements.set(id, root.querySelector(`#${id}`)); return elements.get(id); };
const theme = matchMedia('(prefers-color-scheme: dark)');
let lastStatic = '';
theme.addEventListener('change', () => { lastStatic = ''; if (current) render(current); });
let current, lastPrefs = '', lastNotes = '', lastHistory = '', feedbackUntil = 0;
const time = ms => { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
function feedback(message) { el('desk-feedback').textContent = message; feedbackUntil = Date.now() + 6000; }
async function act(action) {
  try {
    const result = await api.focusAction({...action,...(current?.session && ['pause','resume','stay','end'].includes(action.type) ? {sessionId:current.session.id} : {})});
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
  if (!window.MischiefFocus.acceptsState(current,state)) return;
  current = state;
  const { preferences: p, session: s, history, notes } = state;
  // Timer ticks only need the clock/ring and choice cooldown. Do not repaint
  // hundreds of unchanged tab rows or move the controls under a scrolling user.
  if (!el('focus-view').hidden) {
    el('timer-clock').textContent = time(s ? s.remainingMs : p.focusMinutes * 60000);
    el('timer-ring').style.strokeDashoffset = String(502.655 * (s ? s.elapsedMs / s.planMs : 0));
  }
  el('stay-button').disabled = !s?.running || s.kind !== 'focus' || (s.lastChoiceAt !== null && Date.now() - s.lastChoiceAt < 2000);
  if (Date.now() > feedbackUntil && el('desk-feedback').textContent) el('desk-feedback').textContent = '';
  const staticKey = JSON.stringify([p, state.ink, state.presence, history, notes, state.browser, state.saveError, state.recovered, s && [s.id,s.kind,s.running,s.intention,s.choices,s.lastChoiceAt]]);
  if (staticKey === lastStatic) return;
  lastStatic = staticKey;
  el('save-warning').hidden = !state.saveError; el('save-warning').textContent = state.saveError || '';
  const prefKey = JSON.stringify([p, state.ink, state.presence]);
  if (prefKey !== lastPrefs) {
    lastPrefs = prefKey;
    for (const [id, value] of [['focus-minutes', p.focusMinutes], ['break-minutes', p.breakMinutes], ['long-break-minutes', p.longBreakMinutes], ['presence', state.presence || p.presence], ['quote-seconds', p.quoteSeconds], ['marker-ink', state.ink || 'black']]) if (document.activeElement !== el(id) || ['presence','marker-ink'].includes(id)) el(id).value = value;
    for (const [id, value] of [['peek-focus', p.peekDuringFocus], ['auto-quotes', p.autoQuotes], ['quiet-focus', p.quietFocus], ['drag-enabled', p.dragEnabled], ['chase-cursor', p.chaseCursor], ['completion-sound', p.completionSound], ['return-session', p.returnAfterSession], ['quotes-enabled', p.quotesEnabled], ['show-hud', p.showHud], ['vignette', p.vignette], ['celebrations', p.celebrations],['timer-locked',p.timerLocked],['play-enabled',p.playEnabled]]) el(id).checked = value;
  }
  el('quick-monkey').checked = state.presence !== 'hidden';
  for (const [id, value] of [['timer-opacity', p.timerOpacity], ['monkey-size', Math.round(p.monkeyScale * 100)], ['glow-intensity', p.glowIntensity], ['edge-coverage', p.edgeCoverage], ['screen-style', p.screenStyle]]) if (document.activeElement !== el(id)) el(id).value = value;
  for (const id of ['timer-opacity','monkey-size','glow-intensity']) el(id + '-value').textContent = el(id).value + '%';
  el('timer-opacity').disabled = !p.showHud; el('monkey-size').disabled = state.presence === 'hidden';
  el('edge-coverage-value').textContent = p.edgeCoverage + ' px';
  el('edge-coverage').disabled = !p.vignette;
  el('glow-intensity').disabled = !p.vignette;
  const edges = window.MischiefFocus.focusEdges(p, theme.matches || state.ink==='white');
  el('glow-preview').style.background = edges.style === 'dark' ? '#242424' : '#fafafa';
  el('glow-preview').style.boxShadow = `inset 0 0 24px 5px rgb(${edges.rgb} / ${edges.alpha})`;
  el('quotes-status').textContent = !p.quotesEnabled ? 'Quotes are off. Switch on for regular encouragement.' : state.presence === 'hidden' ? 'Quotes are on. Show Monkey to see them.' : !p.autoQuotes ? 'Automatic quotes are off. A little encouragement still works.' : p.quietFocus && s?.running && s.kind === 'focus' ? 'Quotes are paused during focus. Change this in More behaviour options.' : `Warm quotes every ${p.quoteSeconds} seconds.`;
  renderShield(state);
  el('encourage').disabled = !p.quotesEnabled;
  el('quote-seconds').disabled = !p.quotesEnabled || !p.autoQuotes;
  el('start-form').hidden = !!s; el('session-controls').hidden = !s;
  el('timer-clock').textContent = time(s ? s.remainingMs : p.focusMinutes * 60000);
  el('timer-label').textContent = s?.kind === 'break' ? 'A little breathing room' : 'Focus session timer';
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
  if (document.activeElement !== el('tab-policy')) el('tab-policy').value = shield.onlyWorkTabs ? 'work' : 'blocked';
  el('restrict-work-sites').checked = shield.restrictWorkSites; el('work-site-option').hidden = !shield.onlyWorkTabs;
  el('workspace-help').textContent = shield.onlyWorkTabs ? 'Allow the tabs you need. All other tabs and new tabs are locked during focus. Website and feature blocks still apply.' : 'Tick Block this tab beside a page you want unavailable during focus. Your page stays open underneath a cover.';
  el('block-shorts').checked = shield.features.shorts; el('block-reels').checked = shield.features.reels;
  const active = shield.enabled && state.session?.running && state.session.kind === 'focus';
  el('browser-status').textContent = browser.preview ? 'Preview only · real blocking needs the app + extension' : browser.error || (browser.outdated ? 'Reload your updated FocusShield extension to activate protection' : (!browser.connected ? 'Not connected · connect the browser extension' : `${active ? browser.needsAttention ? 'Some tabs need attention' : browser.enforced ? 'Blocking active' : 'Connected · applying restrictions…' : 'Connected · blocking ready'} · ${browser.clients?.map(c => c.name).join(', ') || 'browser'}`));
  if (browser.legacyCount && !browser.outdated) el('browser-status').textContent += ' · older extension paused; reload it';
  el('browser-status').dataset.connected = String(browser.connected);
  el('pairing-code').value = browser.pairingCode || '';
  el('copy-pairing').disabled = !browser.pairingCode;
  el('extension-folder').disabled = !!browser.preview;
  el('preview-shield-note').hidden = !browser.preview;
  el('rule-count').textContent = `${shield.websites.length + Number(shield.features.shorts) + Number(shield.features.reels)} selected`;
  const liveKeys = new Set((browser.tabs || []).map(t => t.key));
  el('blocking-summary').textContent = !shield.enabled ? 'Off' : `${(shield.onlyWorkTabs ? shield.workTabs : shield.lockedTabs).filter(key => liveKeys.has(key)).length} ${shield.onlyWorkTabs ? 'work tabs' : 'tabs'} · ${shield.websites.length + Number(shield.features.shorts) + Number(shield.features.reels)} rules`;
  el('tab-count').textContent = `${(shield.onlyWorkTabs ? shield.workTabs : shield.lockedTabs).filter(key => liveKeys.has(key)).length} selected`;
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
  const tabs = browser.tabs || [], tabsByKey = new Map(tabs.map(t => [t.key, t])), tabKey = JSON.stringify([tabs.map(t => [t.key,t.title,t.url]), shield.onlyWorkTabs, shield.workTabs, shield.lockedTabs, shield.workOrigins, shield.restrictWorkSites, shield.websites, shield.features]);
  el('tab-empty').hidden = tabs.length > 0;
  if (tabKey !== lastTabKey) {
    lastTabKey = tabKey;
    el('browser-tabs').replaceChildren(...tabs.map(tab => {
      const li = document.createElement('li'), text = document.createElement('div'), title = document.createElement('strong'), url = document.createElement('small'), status = document.createElement('small'), choices = document.createElement('div');
      li.dataset.tabKey = tab.key; title.textContent = tab.title; url.textContent = tab.url; status.className = 'tab-protection'; text.append(title, url, status); choices.className = 'tab-options';
      const field = shield.onlyWorkTabs ? 'workTabs' : 'lockedTabs', label = shield.onlyWorkTabs ? 'Allow during focus' : 'Block this tab';
      const item = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = shield[field].includes(tab.key); input.setAttribute('aria-label', `${label}: ${tab.title}`);
      input.onchange = () => {
        const p = current.preferences.shield, opposite = field === 'workTabs' ? 'lockedTabs' : 'workTabs';
        const existing = p[field].filter(key => liveKeys.has(key));
        const origins = Object.fromEntries(Object.entries(p.workOrigins).filter(([key]) => liveKeys.has(key)));
        if (input.checked && field === 'workTabs') origins[tab.key] = new URL(tab.url).origin;
        act({ type: 'shield', values: { ...(input.checked ? { enabled: true } : {}), [field]: input.checked ? [...existing.filter(key => key !== tab.key), tab.key] : existing.filter(key => key !== tab.key), workOrigins: origins, ...(input.checked ? { [opposite]: p[opposite].filter(key => key !== tab.key && liveKeys.has(key)) } : {}) } });
      };
      item.append(input, document.createTextNode(label)); choices.append(item);
      const approve = document.createElement('button'); approve.type = 'button'; approve.className = 'approve-site'; approve.textContent = 'Approve this site';
      approve.hidden = !(shield.onlyWorkTabs && shield.restrictWorkSites && shield.workTabs.includes(tab.key) && shield.workOrigins[tab.key] !== new URL(tab.url).origin && !window.MischiefShield.reason(tab.url, tab.key, { active: true, shield: { ...shield, restrictWorkSites: false } }));
      approve.onclick = () => act({ type: 'shield', values: { workOrigins: { ...current.preferences.shield.workOrigins, [tab.key]: new URL(tab.url).origin } } });
      text.append(approve); li.append(text, choices); return li;
    }));
  }
  for (const row of el('browser-tabs').children) {
    const tab = tabsByKey.get(row.dataset.tabKey), protection = tab?.protection;
    const labels = { available: 'Available', off: 'Blocking is off', scheduled: 'Will lock when you start', paused: 'Unlocked · timer paused', checking: 'Applying protection…', locked: 'Locked for this session', unsupported: 'Needs attention' };
    const status = row.querySelector('.tab-protection');
    let label = protection ? labels[protection.status] || 'Checking protection…' : 'Protection status not confirmed';
    if (protection?.reason && shield.onlyWorkTabs && shield.workTabs.includes(tab.key) && ['locked','checking','scheduled'].includes(protection.status)) label += ' · ' + protection.reason;
    if (protection?.status === 'unsupported') label += ' · Refresh tab or check extension site access';
    if (status.textContent !== label) status.textContent = label;
    if (status.dataset.status !== (protection?.status || 'checking')) status.dataset.status = protection?.status || 'checking';
    if (status.title !== (protection?.reason || '')) status.title = protection?.reason || '';

  }

}
for (const button of root.querySelectorAll('[data-mode]')) button.onclick = () => act({ type: 'preset', name: button.dataset.mode });
el('shield-enabled').onchange = () => act({ type: 'shield', values: { enabled: el('shield-enabled').checked } });
el('tab-policy').onchange = () => act({ type: 'shield', values: { enabled: true, onlyWorkTabs: el('tab-policy').value === 'work' } });
el('restrict-work-sites').onchange = () => act({ type: 'shield', values: { restrictWorkSites: el('restrict-work-sites').checked } });
for (const [id, key] of [['block-shorts', 'shorts'], ['block-reels', 'reels']]) el(id).onchange = () => act({ type: 'shield', values: { ...(el(id).checked ? { enabled: true } : {}), features: { [key]: el(id).checked } } });
el('website-form').onsubmit = async event => { event.preventDefault(); if (await act({ type: 'shield', values: { enabled: true, websites: [...current.preferences.shield.websites, el('website-input').value] } })) el('website-input').value = ''; };
el('extension-folder').onclick = () => act({ type: 'browser-folder' });
el('copy-pairing').onclick = async () => { if (await act({ type: 'copy-pairing' })) feedback('Pairing code copied. Paste it in your browser extension.'); };
function section(name) {
  for (const view of ['focus','blocking','monkey','appearance','notes']) el(view + '-view').hidden = view !== name;
  for (const button of root.querySelectorAll('[data-desk-tab]')) {const selected=button.dataset.deskTab===name;button.setAttribute('aria-pressed',String(selected));if(button.getAttribute('role')==='tab'){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}}
  root.querySelector('.desk-intro').textContent={focus:'Set your intention and focus time. Presets and break options are below.',blocking:'Choose websites, features and tabs to restrict during a running focus timer.',monkey:'Choose how Mischief moves, speaks and responds to your hand.',appearance:'Adjust the floating timer, neutral screen edges and celebration effects.',notes:'Save a thought for later, or revisit your recent focus sessions.'}[name];
  lastStatic = ''; if (current) render(current);
  root.scrollIntoView({ block: 'start', behavior: 'instant' });
}
for (const button of root.querySelectorAll('[data-desk-tab]')) button.onclick = () => section(button.dataset.deskTab);
el('choose-blocking').onclick = () => section('blocking');
el('quick-monkey').onchange = () => act({ type: 'presence', value: el('quick-monkey').checked ? current.preferences.lastPresence : 'hidden' });
for (const [id, key, factor] of [['timer-opacity','timerOpacity',1], ['monkey-size','monkeyScale',.01], ['glow-intensity','glowIntensity',1], ['edge-coverage','edgeCoverage',1]]) el(id).oninput = () => { el(id + '-value').textContent = el(id).value + (id === 'edge-coverage' ? ' px' : '%'); act({ type: 'preferences', values: { [key]: Number(el(id).value) * factor } }); };
el('reset-timer').onclick=()=>act({type:'timer-reset'});
nav.addEventListener('keydown',e=>{const keys=['ArrowRight','ArrowLeft','Home','End'];if(!keys.includes(e.key))return;const tabs=[...nav.querySelectorAll('[role=tab]')],i=tabs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;section(tabs[j].dataset.deskTab);tabs[j].focus();});
el('screen-style').onchange = () => act({ type: 'preferences', values: { screenStyle: el('screen-style').value } });
el('reset-appearance').onclick = () => { const d = window.MischiefFocus.defaults; act({ type: 'preferences', values: { timerOpacity: d.timerOpacity, monkeyScale: d.monkeyScale, glowIntensity: d.glowIntensity, screenStyle: d.screenStyle, edgeCoverage: d.edgeCoverage } }); };
el('start-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!await act({ type: 'preferences', values: { focusMinutes: Number(el('focus-minutes').value), breakMinutes: Number(el('break-minutes').value) } })) return;
  if (await act({ type: 'start', intention: el('intention').value })) feedback('Focus session started. Use Pause/Resume here or on the top timer.');
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
for (const [id, key, check] of [['focus-minutes', 'focusMinutes'], ['break-minutes', 'breakMinutes'], ['long-break-minutes', 'longBreakMinutes'], ['quote-seconds', 'quoteSeconds'], ['peek-focus', 'peekDuringFocus', true], ['auto-quotes', 'autoQuotes', true], ['quiet-focus', 'quietFocus', true], ['drag-enabled', 'dragEnabled', true], ['completion-sound', 'completionSound', true], ['return-session', 'returnAfterSession', true], ['quotes-enabled', 'quotesEnabled', true], ['show-hud', 'showHud', true], ['vignette', 'vignette', true], ['celebrations','celebrations',true],['timer-locked','timerLocked',true],['play-enabled','playEnabled',true]]) {
  el(id).addEventListener('change', () => { if (el(id).checkValidity()) act({ type: 'preferences', values: { [key]: check ? el(id).checked : id === 'presence' ? el(id).value : Number(el(id).value) } }); });
}
el('presence').addEventListener('change', () => act({ type: 'presence', value: el('presence').value }));
el('chase-cursor').addEventListener('change', () => act({ type: 'chase', enabled: el('chase-cursor').checked }));
el('marker-ink').addEventListener('change', () => act({ type: 'appearance', ink: el('marker-ink').value }));
el('encourage').addEventListener('click', () => act({ type: 'quote', category: 'hard' }));
root.querySelector('.close-desk').addEventListener('click', () => api.hideFocus());
api.onFocusState(render);
api.onFocusView?.(view => { section(view === 'monkey'?'monkey':view === 'appearance' ? 'appearance' : view === 'blocking' ? 'blocking' : view === 'thought' ? 'notes' : 'focus'); if (view === 'blocking') el('shield-tabs').scrollIntoView({ block: 'start', behavior: 'instant' }); if (view === 'summary') el('session-summary').scrollIntoView({ block: 'center', behavior: 'instant' }); if (view === 'thought') { el('thought-input').scrollIntoView({ block: 'center', behavior: 'instant' }); el('thought-input').focus(); } });
render(await api.getFocusState());
