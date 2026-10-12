(() => {
  globalThis.__mischiefContent?.dispose?.();
  const stale = document.querySelector('[data-mischief-locked]');
  if (stale) { stale.remove(); if (document.body?.hasAttribute('data-mischief-prior-inert')) { document.body.inert = document.body.dataset.mischiefPriorInert === 'true'; delete document.body.dataset.mischiefPriorInert; } }
  document.querySelector('style[data-mischief=features]')?.remove();
  let state = { active: false }, tabKey = '', lastGood = 0, shield, featureStyle, priorInert = false;
  const send = message => chrome.runtime.sendMessage(message).catch(() => ({}));
  function update() {
    if (!document.documentElement?.dataset) return;
    const active = state.active && Date.now() - lastGood < 6500;
    const current = { ...state, active }, reason = MischiefShield.reason(location.href, tabKey, current);
    for (const old of document.querySelectorAll('[data-mischief-locked]')) if (old !== shield) old.remove();
    if (reason && shield && document.body) document.body.inert = true;
    if (!featureStyle) { featureStyle = document.createElement('style'); featureStyle.dataset.mischief = 'features'; (document.head || document.documentElement)?.append(featureStyle); }
    const host = location.hostname.replace(/^www\./, '');
    document.documentElement.dataset.mischiefShorts = String(active && state.shield?.features?.shorts && (host === 'youtube.com' || host.endsWith('.youtube.com')));
    document.documentElement.dataset.mischiefReels = String(active && state.shield?.features?.reels && (host === 'instagram.com' || host.endsWith('.instagram.com')));
    featureStyle.textContent = active ? ((state.shield?.features?.shorts && (host === 'youtube.com' || host.endsWith('.youtube.com'))) ? 'a[href^="/shorts"],a[href*="youtube.com/shorts"],ytd-reel-shelf-renderer,ytd-rich-shelf-renderer[is-shorts]{display:none!important}' : '') + ((state.shield?.features?.reels && (host === 'instagram.com' || host.endsWith('.instagram.com'))) ? 'a[href^="/reel/"],a[href^="/reels/"]{display:none!important}' : '') : '';
    if (!reason) { if (shield) { shield.remove(); shield = null; if (document.body) { document.body.inert = priorInert; delete document.body.dataset.mischiefPriorInert; } } return; }
    if (!document.documentElement || !document.body) return;
    if (!shield) {
      shield = document.createElement('div'); shield.dataset.mischiefLocked = 'true';
      shield.style.cssText = 'position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;pointer-events:auto!important;';
      const shadow = shield.attachShadow({ mode: 'closed' });
      const node = (tag, text, id) => { const el = document.createElement(tag); if (text) el.textContent = text; if (id) el.id = id; return el; };
      const style = node('style'); style.textContent = ':host{all:initial}section{position:fixed;inset:0;display:grid;place-items:center;background:#faf7ef;color:#302632;font:16px/1.6 system-ui}main{max-width:430px;padding:32px;text-align:center}small{color:#9c643f;letter-spacing:2px}h1{font-size:30px;line-height:1.2}output{font-size:35px;font-variant-numeric:tabular-nums;display:block;margin:20px}button{border:1px solid #dbcbbd;border-radius:12px;background:#fff8ed;color:#302632;padding:12px 18px;font:inherit;cursor:pointer;margin:4px}button:first-of-type{background:#302632;color:#fff}p{font-size:14px;color:#796675}';
      const section = node('section'); section.setAttribute('role','dialog'); section.setAttribute('aria-modal','true'); section.setAttribute('aria-label','Focus Shield');
      const main = node('main'), feedback = node('p','','feedback'); feedback.setAttribute('role','status');
      const returnButton = node('button','Return to work','return'), saveButton = node('button','Save for later','save'); returnButton.type = saveButton.type = 'button';
      main.append(node('small','FOCUS SHIELD'), node('h1','You chose this time for your work.'), node('p','','reason'), node('output'), returnButton, saveButton, feedback, node('p','To unlock, pause or finish the timer in Mischief or its extension menu.'));
      section.append(main); shadow.append(style,section);
      priorInert = document.body.inert; document.body.dataset.mischiefPriorInert = String(priorInert); document.body.inert = true;
      document.documentElement.append(shield);
      shield.focusState = shadow;
      shadow.querySelector('#return').onclick = async () => { const result = await send({ type: 'return' }); shadow.querySelector('#feedback').textContent = result.returned ? '' : 'Choose a work tab in Mischief, or pause your timer from the extension menu.'; };
      shadow.querySelector('#save').onclick = async () => { const result = await send({ type: 'save' }); shadow.querySelector('#feedback').textContent = result.error ? result.error : result.connected ? 'Saved in Keep my thoughts.' : 'Reconnect Mischief to save this page.'; };
      shadow.querySelector('#return').focus();
    }
    if (!shield.isConnected) document.documentElement.append(shield);
    const seconds = Math.ceil((state.remainingMs || 0) / 1000);
    shield.focusState.querySelector('#reason').textContent = reason;
    shield.focusState.querySelector('output').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} remaining`;
  }
  function receive(message, _sender, respond) {
    if (message.type !== 'state') return;
    state = message.state; tabKey = message.tabKey; lastGood = message.lastGood; update();
    const expected = MischiefShield.reason(location.href, tabKey, { ...state, active: state.active && Date.now() - lastGood < 6500 });
    const rect = shield?.getBoundingClientRect(), style = shield && getComputedStyle(shield);
    const protectedPage = !!shield?.isConnected && !!document.body?.inert && style.position === 'fixed' && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && rect.left <= 1 && rect.top <= 1 && rect.right >= innerWidth - 1 && rect.bottom >= innerHeight - 1;
    respond({ url: location.href, locked: protectedPage, ready: !expected || protectedPage, loaded: document.readyState === 'complete', reason: expected });
  }
  chrome.runtime.onMessage.addListener(receive);
  async function refresh() { const result = await send({ type: 'state' }); if (result.state) { state = result.state; tabKey = result.tabKey; lastGood = result.lastGood; } update(); }
  const interval = setInterval(refresh, 500);
  globalThis.__mischiefContent = { dispose() { clearInterval(interval); try { chrome.runtime.onMessage.removeListener(receive); } catch {} document.removeEventListener('DOMContentLoaded', update); featureStyle?.remove(); shield?.remove(); delete document.documentElement.dataset.mischiefShorts; delete document.documentElement.dataset.mischiefReels; if (document.body?.hasAttribute('data-mischief-prior-inert')) { document.body.inert = document.body.dataset.mischiefPriorInert === 'true'; delete document.body.dataset.mischiefPriorInert; } } };
  refresh(); document.addEventListener('DOMContentLoaded', update);
})();
