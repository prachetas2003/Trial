importScripts('shield-policy.js');
const ENDPOINT = 'http://127.0.0.1:43827/sync';
let state = { active: false }, lastGood = 0, pollBusy = false, ruleKey = '', lastStored = '', identity = '', paired = false;
const originalUrls = new Map();
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
    const locked = tabs.filter(t => p.lockedTabs.includes(key(t.id))).map(t => t.id);
    if (locked.length) { const rule = redirect('^https?://.*'); rule.condition.tabIds = locked; rules.push(rule); }
    for (const host of p.websites) rules.push(redirect(`^https?://([a-z0-9-]+\\.)*${host.replace(/\./g, '\\.')}(:[0-9]+)?/.*`));
    if (p.features.shorts) rules.push(redirect('^https?://([a-z0-9-]+\\.)*youtube\\.com(:[0-9]+)?/shorts(/|[?#]|$).*'));
    if (p.features.reels) rules.push(redirect('^https?://([a-z0-9-]+\\.)*instagram\\.com(:[0-9]+)?/reels?(/|[?#]|$).*'));
  }
  const nextKey = JSON.stringify(rules);
  if (nextKey !== ruleKey) { const old = await chrome.declarativeNetRequest.getSessionRules(); await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map(r => r.id), addRules: rules }); ruleKey = nextKey; }
  state = next;
  const stored = JSON.stringify(next);
  if (stored !== lastStored) { await chrome.storage.session.set({ shieldState: next, lastGood }); lastStored = stored; }
  await chrome.action.setBadgeText({ text: next.active ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#c86434' });
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
    chrome.tabs.sendMessage(tab.id, { type: 'state', state: next, tabKey: key(tab.id), lastGood }).catch(() => {});
  }
}
async function poll(action, url, force = false) {
  if (pollBusy) return action || force ? new Promise(resolve => setTimeout(() => resolve(poll(action, url, force)), 100)) : state; pollBusy = true;
  try {
    const saved = await chrome.storage.local.get(['pairingCode', 'clientId']);
    identity = saved.clientId || crypto.randomUUID(); paired = !!saved.pairingCode;
    if (!saved.clientId) await chrome.storage.local.set({ clientId: identity });
    const tabs = await chrome.tabs.query({});
    if (!saved.pairingCode) { await restrictions({ active: false, connected: false }, tabs); return state; }
    const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mischief-Key': saved.pairingCode }, body: JSON.stringify({ clientId: identity, browser: navigator.userAgent.includes('Edg/') ? 'Edge' : 'Chrome', tabs: tabs.map(t => ({ id: t.id, title: t.title, url: original(t) })), action, url, applied: { active: state.active, sessionId: state.sessionId, rules: JSON.stringify(MischiefShield.settings(state.shield)) } }), signal: AbortSignal.timeout(2000) });
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
chrome.tabs.onCreated.addListener(() => poll());
chrome.tabs.onRemoved.addListener(id => { originalUrls.delete(id); poll(); });
chrome.tabs.onUpdated.addListener((_id, change) => { if (change.url) poll(); });
// Local storage is an extension API activity, keeping the worker alive while paired; alarms recover idle/suspended workers.
setInterval(() => { if (paired || state.active) poll(); }, 1000);
(async () => { const old = await chrome.declarativeNetRequest.getSessionRules(); await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map(r => r.id) }); ruleKey = ''; await poll(); })();
