importScripts('shield-policy.js');
const ENDPOINT = 'http://127.0.0.1:43827/sync';
let state = { active: false }, lastGood = 0, pollBusy = false, ruleKey = '', lastStored = '', identity = '', paired = false, tabProtection = [];
const originalUrls = new Map(), styledTabs = new Map(), generations = new Map();
const blockedPrefix = () => chrome.runtime.getURL('blocked.html');
const key = id => `${identity}:${id}`;
function original(tab) {
  const url = tab.url || tab.pendingUrl || '';
  if (url.startsWith(blockedPrefix())) return originalUrls.get(tab.id) || url.slice(url.indexOf('#') + 1);
  return url;
}
async function navigateIfCurrent(tab, url) {
  const live = await chrome.tabs.get(tab.id).catch(() => null);
  if (live && (live.pendingUrl || live.url) === (tab.pendingUrl || tab.url)) await chrome.tabs.update(tab.id, { url }).catch(() => {});
}
async function restrictions(next, tabs) {
  const p = MischiefShield.settings(next.shield), rules = []; let id = 1;
  const redirect = regex => ({ id: id++, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: `${blockedPrefix()}#\\0` } }, condition: { regexFilter: regex, resourceTypes: ['main_frame'] } });
  if (next.active) {
    if (p.onlyWorkTabs) { const rule = redirect('^https?://.*'); rule.condition.excludedTabIds = tabs.filter(t => p.workTabs.includes(key(t.id))).map(t => t.id); if (!rule.condition.excludedTabIds.length) delete rule.condition.excludedTabIds; rules.push(rule); }
    if (p.onlyWorkTabs && p.restrictWorkSites) {
      for (const tab of tabs.filter(t => p.workTabs.includes(key(t.id)))) {
        const deny = redirect('^https?://.*'); deny.condition.tabIds = [tab.id]; rules.push(deny);
        const origin = p.workOrigins[key(tab.id)];
        if (origin) rules.push({ id: id++, priority: 2, action: { type: 'allow' }, condition: { regexFilter: '^' + origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/', tabIds: [tab.id], resourceTypes: ['main_frame'] } });
      }
    }
    const locked = tabs.filter(t => p.lockedTabs.includes(key(t.id))).map(t => t.id);
    if (locked.length) { const rule = redirect('^https?://.*'); rule.priority = 3; rule.condition.tabIds = locked; rules.push(rule); }
    for (const host of p.websites) { const rule = redirect(`^https?://([a-z0-9-]+\\.)*${host.replace(/\./g, '\\.')}(:[0-9]+)?/.*`); rule.priority = 3; rules.push(rule); }
    if (p.features.shorts) { const rule = redirect('^https?://([a-z0-9-]+\\.)*youtube\\.com(:[0-9]+)?/shorts(/|[?#]|$).*'); rule.priority = 3; rules.push(rule); }
    if (p.features.reels) { const rule = redirect('^https?://([a-z0-9-]+\\.)*instagram\\.com(:[0-9]+)?/reels?(/|[?#]|$).*'); rule.priority = 3; rules.push(rule); }
  }
  const nextKey = JSON.stringify(rules);
  if (nextKey !== ruleKey) { const old = await chrome.declarativeNetRequest.getSessionRules(); await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map(r => r.id), addRules: rules }); ruleKey = nextKey; }
  state = next;
  const stored = JSON.stringify(next);
  if (stored !== lastStored) { await chrome.storage.session.set({ shieldState: next, lastGood }); lastStored = stored; }
  await chrome.action.setBadgeText({ text: next.active ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#c86434' });
  const protection = [];
  for (const tab of tabs) {
    if (!Number.isInteger(tab.id)) continue;
    const url = tab.url || '', actual = original(tab), reason = MischiefShield.reason(actual, key(tab.id), next);
    if (url.startsWith(blockedPrefix()) && !reason) {
      // Only restore pages that this extension redirected. Existing documents remain intact beneath the content shield.
      if (/^https?:\/\//.test(actual)) await navigateIfCurrent(tab, actual);
      else if (!next.active) await navigateIfCurrent(tab, 'chrome://newtab/');
      originalUrls.delete(tab.id);
    } else if (next.active && p.onlyWorkTabs && !p.workTabs.includes(key(tab.id)) && /^(chrome|edge):\/\/newtab\/?$|^about:blank$/.test(url)) {
      originalUrls.set(tab.id, url); await navigateIfCurrent(tab, `${blockedPrefix()}#${url}`);
    }
    if (/^https?:\/\//.test(actual)) {
      const entry = { id: tab.id, generation: tab.generation || 0, url: actual, status: 'available', reason: '' };
      if (url.startsWith(blockedPrefix()) && reason) { entry.status = tab.status === 'complete' ? 'locked' : 'checking'; entry.reason = reason; }
      else {
        const message = { type: 'state', state: next, tabKey: key(tab.id), lastGood };
        let reply;
        try {
          if (next.active && styledTabs.get(tab.id) !== url) { await chrome.scripting.insertCSS({ target: { tabId: tab.id, frameIds: [0] }, files: ['protect.css'], origin: 'USER' }); styledTabs.set(tab.id, url); }
          try { reply = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 }); if (!reply || typeof reply.ready !== 'boolean') throw new Error('Page protection not ready'); }
          catch {
            if (!next.active) throw new Error('No protection needed');
            await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [0] }, files: ['shield-policy.js', 'content.js'] });
            reply = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
          }
          if ((generations.get(tab.id) || 0) !== (tab.generation || 0) || !reply || reply.url !== actual) entry.status = reason ? 'checking' : 'available';
          else if (!reply.ready) { entry.status = reason && reply.loaded ? 'unsupported' : reason ? 'checking' : 'available'; entry.reason = entry.status === 'unsupported' ? 'Protection could not cover this page. Refresh it or check extension site access.' : ''; }
          else if (reply.locked && reason) { entry.status = 'locked'; entry.reason = reason; }
          else if (reason) entry.status = 'checking';
        } catch { entry.status = reason ? 'unsupported' : 'available'; entry.reason = reason ? 'Browser protection could not be added. Refresh this tab, or check extension site access.' : ''; }
      }
      protection.push(entry);
    }
  }
  tabProtection = protection;
}
async function poll(action, url, force = false) {
  if (pollBusy) return action || force ? new Promise(resolve => setTimeout(() => resolve(poll(action, url, force)), 100)) : state; pollBusy = true;
  try {
    const saved = await chrome.storage.local.get(['pairingCode', 'clientId']);
    const profileId = saved.clientId || crypto.randomUUID();
    if (!saved.clientId) await chrome.storage.local.set({ clientId: profileId });
    const session = await chrome.storage.session.get('browserEpoch');
    const epoch = session.browserEpoch || crypto.randomUUID();
    if (!session.browserEpoch) await chrome.storage.session.set({ browserEpoch: epoch });
    // Session storage survives worker restarts but resets with the browser, preventing reused tab IDs inheriting old permissions.
    identity = `${profileId}_${epoch}`; paired = !!saved.pairingCode;
    const tabs = (await chrome.tabs.query({})).map(t => ({...t, generation: generations.get(t.id) || 0}));
    if (!saved.pairingCode) { await restrictions({ active: false, connected: false }, tabs); return state; }
    const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mischief-Key': saved.pairingCode }, body: JSON.stringify({ clientId: identity, version: chrome.runtime.getManifest().version, browser: navigator.userAgent.includes('Edg/') ? 'Edge' : 'Chrome', tabs: tabs.map(t => ({ id: t.id, generation: t.generation, title: t.title, url: original(t) })), action, url, protection: tabProtection, applied: { active: state.active, sessionId: state.sessionId, rules: JSON.stringify(MischiefShield.settings(state.shield)) } }), signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error(`Connection refused (${response.status})`);
    const next = await response.json(); lastGood = Date.now();
    await restrictions({ ...next, connected: true }, tabs);
  } catch (error) {
    // Failure releases restrictions; persisted session rules are also cleared at worker startup.
    await restrictions({ active: false, connected: false, error: error.message }, await chrome.tabs.query({})).catch(() => {});
  } finally { pollBusy = false; }
  return state;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  (async () => {
    if (message.type === 'state') return { state, tabKey: key(sender.tab?.id), lastGood };
    if (message.type === 'refresh') return poll(undefined, undefined, true);
    if (message.type === 'stay' || message.type === 'pause') return poll(message.type);
    if (message.type === 'save') return poll('save', sender.tab ? original(sender.tab) : message.url);
    if (message.type === 'return') {
      const tabs = await chrome.tabs.query({});
      const allowed = tabs.find(t => !MischiefShield.reason(original(t), key(t.id), state) && /^https?:\/\//.test(original(t)));
      if (allowed) { await chrome.tabs.update(allowed.id, { active: true }); await chrome.windows.update(allowed.windowId, { focused: true }); return { returned: true }; }
      return { returned: false };
    }
    return {};
  })().then(respond).catch(() => respond({ error: 'Could not update Focus Shield.' }));
  return true;
});
chrome.alarms.create('mischief-sync', { periodInMinutes: .5 });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.pairingCode) poll(undefined, undefined, true); });
chrome.alarms.onAlarm.addListener(() => poll());
chrome.runtime.onStartup.addListener(() => poll());
chrome.tabs.onActivated.addListener(() => poll(undefined, undefined, true));
chrome.tabs.onCreated.addListener(() => poll());
chrome.tabs.onRemoved.addListener(id => { originalUrls.delete(id); styledTabs.delete(id); generations.delete(id); poll(); });
chrome.tabs.onUpdated.addListener((id, change) => { if (change.status === 'loading') { styledTabs.delete(id); generations.set(id,(generations.get(id)||0)+1); tabProtection = tabProtection.filter(p=>p.id!==id); } if (change.url || change.status === 'complete') poll(); });
// Local storage is an extension API activity, keeping the worker alive while paired; alarms recover idle/suspended workers.
setInterval(() => { if (paired || state.active) poll(); }, 1000);
(async () => { const old = await chrome.declarativeNetRequest.getSessionRules(); await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map(r => r.id) }); ruleKey = ''; await poll(); })();
