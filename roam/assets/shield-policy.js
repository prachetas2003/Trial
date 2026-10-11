(function(root) {
  'use strict';
  function domain(value) {
    if (typeof value !== 'string') return null;
    try {
      const text = value.trim();
      if (!text || /[\s*]/.test(text)) return null;
      const url = new URL(text.includes('://') ? text : `https://${text}`);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) return null;
      const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
      return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ? host : null;
    } catch { return null; }
  }
  function settings(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    const keys = items => Array.isArray(items) ? [...new Set(items.filter(x => typeof x === 'string' && /^[a-zA-Z0-9_-]{8,80}:\d+$/.test(x)))].slice(0, 200) : [];
    return { enabled: value.enabled === true, onlyWorkTabs: value.onlyWorkTabs === true,
      websites: [...new Set((Array.isArray(value.websites) ? value.websites : []).map(domain).filter(Boolean))].slice(0, 50),
      features: { shorts: value.features?.shorts !== false, reels: value.features?.reels !== false },
      workTabs: keys(value.workTabs), lockedTabs: keys(value.lockedTabs) };
  }
  function reason(url, tabKey, state) {
    if (!state?.active) return '';
    const p = settings(state.shield);
    if (p.onlyWorkTabs && !p.workTabs.includes(tabKey)) return 'This tab is outside your work tabs.';
    if (p.lockedTabs.includes(tabKey)) return 'You locked this tab for your session.';
    try {
      const u = new URL(url), host = u.hostname.toLowerCase().replace(/^www\./, '');
      if (!['http:', 'https:'].includes(u.protocol)) return '';
      if (p.websites.some(d => host === d || host.endsWith(`.${d}`))) return 'This website is saved for after your session.';
      if (p.features.shorts && (host === 'youtube.com' || host.endsWith('.youtube.com')) && /^\/shorts(?:\/|$)/.test(u.pathname)) return 'YouTube Shorts are saved for later.';
      if (p.features.reels && (host === 'instagram.com' || host.endsWith('.instagram.com')) && /^\/reels?(?:\/|$)/.test(u.pathname)) return 'Instagram Reels are saved for later.';
    } catch { /* Browser pages have no website rules. */ }
    return '';
  }
  const api = { domain, settings, reason };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MischiefShield = api;
})(typeof window !== 'undefined' ? window : globalThis);
