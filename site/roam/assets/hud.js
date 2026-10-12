export class OverlayBar {
  constructor(api) {
    this.api = api; this.state = null; this.theme = matchMedia('(prefers-color-scheme: dark)');
    this.theme.addEventListener('change', () => { if (this.state) this.render(this.state); });
    this.sound = new Audio(new URL('./completion.wav', import.meta.url)); this.sound.preload = 'auto'; this.lastCompletion = null;
    this.element = document.createElement('nav'); this.element.id = 'timer-bar'; this.element.setAttribute('aria-label', 'Mischief focus controls');
    this.element.innerHTML = `<button type="button" id="bar-timer" title="Open my focus corner"><span class="record-dot" aria-hidden="true"></span><span class="bar-time"><span id="bar-label">Ready to focus</span><output id="bar-clock">25:00</output></span></button><button type="button" id="bar-pause" aria-label="Pause timer" title="Pause timer" hidden>Ⅱ</button><span class="bar-divider" aria-hidden="true"></span><button type="button" id="bar-stay" title="Feeling distracted? Record a choice to stay" disabled><span aria-hidden="true">✦</span><span class="stay-label">I’m staying</span><span id="bar-choices">0</span></button><button type="button" id="bar-thought" title="Keep a thought for later" aria-label="Keep a thought for later">✎</button><button type="button" id="bar-tuck" title="Tuck monkey to the edge" aria-label="Tuck monkey to the edge"></button><button type="button" id="bar-chase" aria-pressed="false" title="Chase my cursor until switched off">Chase</button><button type="button" id="bar-settings" title="Quick controls" aria-label="Quick controls"><svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14M7 3v4M13 8v4M7 13v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button><span id="bar-feedback" class="sr-only" role="status" aria-live="polite"></span>`;
    document.body.append(this.element);
    this.message = document.createElement('aside'); this.message.id = 'bar-message'; this.message.hidden = true; this.message.setAttribute('role','status'); document.body.append(this.message);
    for (const side of ['top','bottom','left','right']) { const edge=document.createElement('div'); edge.className='focus-edge'; edge.dataset.side=side; edge.setAttribute('aria-hidden','true'); document.body.append(edge); }
    this.element.querySelector('#bar-pause').addEventListener('click', () => this.act({type:this.state?.session?.running ? 'pause' : 'resume'}));
    this.measuredAt=-Infinity; this.boundsDirty=true;
    addEventListener('resize', () => {this.boundsDirty=true;});
    this.element.querySelector('#bar-timer').addEventListener('click', () => api.openFocus(this.state?.highlight?.kind === 'focus' ? 'summary' : 'timer'));
    this.element.querySelector('#bar-thought').addEventListener('click', () => api.openFocus('thought'));
    this.element.querySelector('#bar-stay').addEventListener('click', async () => { if ((!this.state?.session?.running ? await this.act({type:'resume'}) : true) && await this.act({ type: 'stay' })) { this.element.classList.remove('choice-ack'); void this.element.offsetWidth; this.element.classList.add('choice-ack'); } });
    this.element.querySelector('#bar-tuck').addEventListener('click', () => this.act({ type: 'presence', value: this.state?.presence === 'wander' ? 'peek' : 'wander' }));
    this.element.querySelector('#bar-chase').addEventListener('click', () => this.act({ type: 'chase' }));
    this.element.querySelector('#bar-settings').addEventListener('click', () => api.openFocus('appearance'));
    api.onFocusState(state => this.render(state));
    api.getFocusState().then(state => this.render(state)).catch(() => {});
  }
  async act(action) {
    try {
      const result = await this.api.focusAction(action);
      this.element.querySelector('#bar-feedback').textContent = result?.error || (action.type === 'stay' ? 'Choice recorded.' : '');
      if (result?.error) this.showMessage(result.error);
      if (result?.state) this.render(result.state);
      return !result?.error;
    } catch { this.showMessage('That control did not respond. Open controls with Ctrl+Alt+F or restart from the tray.'); return false; }
  }
  showMessage(text) { this.message.textContent=text; this.message.hidden=false; clearTimeout(this.messageTimer); this.messageTimer=setTimeout(()=>{this.message.hidden=true;},8000); }
  render(state) {
    this.state = state; this.boundsDirty=true;
    const prefs = state.preferences;
    this.element.style.setProperty('--timer-alpha', String(prefs.timerOpacity / 100));
    const edges = window.MischiefFocus.focusEdges(prefs, this.theme.matches);
    document.body.style.setProperty('--glow-rgb', edges.rgb);
    document.body.style.setProperty('--glow-alpha', String(edges.alpha));
    document.body.dataset.screenStyle = edges.style;
    this.element.hidden = state.preferences.showHud === false;
    document.body.classList.toggle('focus-vignette', !!state.preferences.vignette && state.session?.kind === 'focus' && state.session.running);
    const s = state.session, p = state.preferences, pending = !!state.highlight;
    const secs = Math.ceil((s ? s.remainingMs : p.focusMinutes * 60000) / 1000);
    const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    this.element.dataset.running = String(!!s?.running); this.element.dataset.kind = s?.kind || 'ready'; this.element.classList.toggle('has-highlight', pending);
    this.element.querySelector('#bar-label').textContent = pending && !s ? state.highlight.kind === 'focus' ? state.highlight.completed ? 'Session complete' : 'Session saved' : state.highlight.completed ? 'Break complete' : 'Break ended' : !s ? 'Ready to focus' : !s.running ? 'Paused' : s.kind === 'break' ? 'Break' : 'Focus';
    this.element.querySelector('#bar-clock').textContent = pending && !s ? state.highlight.kind === 'focus' ? 'Highlights' : 'Focus corner' : clock;
    const pause=this.element.querySelector('#bar-pause'); pause.hidden=!s; pause.textContent=s?.running ? 'Ⅱ' : '▶'; pause.title=s?.running ? 'Pause timer' : 'Resume timer'; pause.setAttribute('aria-label',pause.title);
    this.element.querySelector('.stay-label').textContent=s && !s.running && s.kind==='focus' ? 'Resume & stay' : 'I’m staying';
    this.element.querySelector('#bar-timer').title = pending ? 'See your session highlights' : 'Open my focus corner';
    const stay = this.element.querySelector('#bar-stay'); stay.disabled = !s || s.kind !== 'focus' || (s.lastChoiceAt !== null && Date.now() - s.lastChoiceAt < 2000);
    this.element.querySelector('#bar-choices').textContent = String(s?.choices || 0);
    const tuck = this.element.querySelector('#bar-tuck'), wandering = state.presence === 'wander';
    if (this.wandering !== wandering) tuck.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="${wandering ? 'M5 5 15 15M8 15h7V8' : 'M15 15 5 5M5 12V5h7'}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    tuck.title = wandering ? 'Tuck monkey to the edge' : 'Bring monkey back'; tuck.setAttribute('aria-label', tuck.title); this.wandering = wandering;
    this.element.querySelector('#bar-chase').setAttribute('aria-pressed', String(p.chaseCursor));
  }
  complete(event) {
    if (event.id === this.lastCompletion) return;
    this.lastCompletion = event.id;
    if (!event.completed || !event.sound) return;
    this.sound.currentTime = 0;
    window.__completionSound = { id: event.id, attempts: (window.__completionSound?.attempts || 0) + 1, status: 'playing' };
    this.sound.play().then(() => { window.__completionSound.status = 'played'; }).catch(() => {
      window.__completionSound.status = 'blocked'; this.element.querySelector('#bar-feedback').textContent = 'Timer complete. Open your highlights.';
    });
  }
  rectangle(area) {
    const now=performance.now();
    if (this.boundsDirty || !this.rect?.width || now-this.measuredAt >= 50) { this.rect=this.element.getBoundingClientRect(); this.measuredAt=now; this.boundsDirty=false; }
    const r = this.element.hidden ? { x: 0, y: 0, width: 0, height: 0 } : this.rect;
    return { x: r.x + area.x, y: r.y + area.y, width: r.width, height: r.height };
  }
}
