(() => {
  let state = { active: false }, tabKey = '', lastGood = 0, shield, featureStyle, priorInert = false;
  const send = message => chrome.runtime.sendMessage(message).catch(() => ({}));
  function update() {
    const active = state.active && Date.now() - lastGood < 6500;
    const current = { ...state, active }, reason = MischiefShield.reason(location.href, tabKey, current);
    if (!featureStyle) { featureStyle = document.createElement('style'); featureStyle.dataset.mischief = 'features'; (document.head || document.documentElement)?.append(featureStyle); }
    const host = location.hostname.replace(/^www\./, '');
    featureStyle.textContent = active ? ((state.shield?.features?.shorts && (host === 'youtube.com' || host.endsWith('.youtube.com'))) ? 'a[href^="/shorts"],a[href*="youtube.com/shorts"],ytd-reel-shelf-renderer,ytd-rich-shelf-renderer[is-shorts]{display:none!important}' : '') + ((state.shield?.features?.reels && (host === 'instagram.com' || host.endsWith('.instagram.com'))) ? 'a[href^="/reel/"],a[href^="/reels/"]{display:none!important}' : '') : '';
    if (!reason) { if (shield) { shield.remove(); shield = null; if (document.body) document.body.inert = priorInert; } return; }
    if (!document.documentElement || !document.body) return;
    if (!shield) {
      shield = document.createElement('div'); shield.dataset.mischiefLocked = 'true';
      shield.style.cssText = 'position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;pointer-events:auto!important;';
      const shadow = shield.attachShadow({ mode: 'closed' });
      shadow.innerHTML = `<style>:host{all:initial}section{position:fixed;inset:0;display:grid;place-items:center;background:#faf7ef;color:#302632;font:16px/1.6 system-ui}main{max-width:430px;padding:32px;text-align:center}small{color:#9c643f;letter-spacing:2px}h1{font-size:30px;line-height:1.2}output{font-size:35px;font-variant-numeric:tabular-nums;display:block;margin:20px}button{border:1px solid #dbcbbd;border-radius:12px;background:#fff8ed;color:#302632;padding:12px 18px;font:inherit;cursor:pointer;margin:4px}button:first-of-type{background:#302632;color:#fff}p{font-size:14px;color:#796675}</style><section role="dialog" aria-modal="true" aria-label="Focus Shield"><main><small>FOCUS SHIELD</small><h1>You chose this time for your work.</h1><p id="reason"></p><output></output><button id="return">Return to work</button><button id="save">Save for later</button><p id="feedback" role="status"></p><p>To unlock, pause or finish the timer in Mischief or its extension menu.</p></main></section>`;
      priorInert = document.body.inert; document.body.inert = true;
      document.documentElement.append(shield);
      shield.focusState = shadow;
      shadow.querySelector('#return').onclick = async () => { const result = await send({ type: 'return' }); shadow.querySelector('#feedback').textContent = result.returned ? '' : 'Choose a work tab in Mischief, or pause your timer from the extension menu.'; };
      shadow.querySelector('#save').onclick = async () => { const result = await send({ type: 'save' }); shadow.querySelector('#feedback').textContent = result.connected ? 'Saved in Keep my thoughts.' : 'Reconnect Mischief to save this page.'; };
      shadow.querySelector('#return').focus();
    }
    if (!shield.isConnected) document.documentElement.append(shield);
    const seconds = Math.ceil((state.remainingMs || 0) / 1000);
    shield.focusState.querySelector('#reason').textContent = reason;
    shield.focusState.querySelector('output').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} remaining`;
  }
  chrome.runtime.onMessage.addListener(message => { if (message.type === 'state') { state = message.state; tabKey = message.tabKey; lastGood = message.lastGood; update(); } });
  async function refresh() { const result = await send({ type: 'state' }); if (result.state) { state = result.state; tabKey = result.tabKey; lastGood = result.lastGood; } update(); }
  setInterval(refresh, 500); refresh(); document.addEventListener('DOMContentLoaded', update);
})();
