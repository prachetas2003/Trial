const http = require('node:http');
const crypto = require('node:crypto');
const policy = require('./shield-policy.js');
const PORT = 43827;
function createShieldBridge({ token, getState, action, now = Date.now, port = PORT }) {
  const clients = new Map(); let error = '';
  const equal = value => typeof value === 'string' && Buffer.byteLength(value) === Buffer.byteLength(token) && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(token));
  const fresh = () => [...clients.values()].filter(c => now() - c.seenAt < 7000);
  const info = () => {
    const current = getState(), peers = fresh();
    const active = current.preferences.shield.enabled && current.session?.running && current.session.kind === 'focus';
    const expected = JSON.stringify(policy.settings(current.preferences.shield));
    return { available: !error && !!server.listening, error, connected: peers.length > 0,
      enforced: !!active && peers.length > 0 && peers.every(c => c.applied?.active && c.applied.sessionId === current.session.id && c.applied.rules === expected),
      clients: peers.map(c => ({ id: c.id, name: c.name })), tabs: peers.flatMap(c => c.tabs), pairingCode: token };
  };
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    const trustedOrigin = typeof origin === 'string' && /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
    if ((host !== `127.0.0.1:${server.address()?.port}`) || !trustedOrigin) { res.writeHead(403); res.end(); return; }
    res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mischief-Key'); res.setHeader('Access-Control-Allow-Methods', 'POST'); res.writeHead(204); res.end(); return; }
    if (!equal(req.headers['x-mischief-key'])) { res.writeHead(401); res.end('{}'); return; }
    if (req.method !== 'POST' || req.url !== '/sync') { res.writeHead(404); res.end('{}'); return; }
    try {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 128000) { res.writeHead(413); res.end('{}'); return; } }
      const input = JSON.parse(body), id = input.clientId;
      for (const [key, client] of clients) if (now() - client.seenAt > 60000) clients.delete(key);
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(id) || (!clients.has(id) && clients.size >= 8)) throw new Error('Invalid browser identity.');
      if (clients.has(id) && clients.get(id).origin !== origin) throw new Error('Browser identity belongs to another extension.');
      const tabs = (Array.isArray(input.tabs) ? input.tabs : []).filter(t => Number.isSafeInteger(t.id) && t.id >= 0 && typeof t.url === 'string' && /^https?:\/\//.test(t.url)).slice(0, 200).map(t => ({ key: `${id}:${t.id}`, id: t.id, clientId: id, title: String(t.title || 'Untitled tab').slice(0, 200), url: t.url.slice(0, 4096) }));
      clients.set(id, { id, name: input.browser === 'Edge' ? 'Edge' : 'Chrome / Chromium', seenAt: now(), origin, tabs, applied: input.applied && { active: input.applied.active === true, sessionId: String(input.applied.sessionId || '').slice(0, 100), rules: String(input.applied.rules || '').slice(0, 40000) } });
      // Browser pages can request a focus action, never change settings or arbitrary app actions.
      if (input.action === 'stay' || input.action === 'pause') action({ type: input.action });
      if (input.action === 'save' && typeof input.url === 'string') { const u = new URL(input.url); if (['http:', 'https:'].includes(u.protocol)) action({ type: 'note-add', text: `For later: ${u.href.slice(0, 900)}` }); }
      const state = getState(), s = state.session, shield = policy.settings(state.preferences.shield);
      res.end(JSON.stringify({ active: shield.enabled && !!s?.running && s.kind === 'focus', sessionId: s?.id || '', remainingMs: s?.remainingMs || 0, intention: s?.intention || '', shield, clientId: id, leaseMs: 6000 }));
    } catch { res.writeHead(400); res.end('{}'); }
  });
  server.requestTimeout = 3000; server.headersTimeout = 3000;
  server.on('error', e => { error = e.code === 'EADDRINUSE' ? 'Browser connection port is already in use. Quit other Mischief copies and restart.' : 'Browser connection is unavailable.'; });
  server.listen(port, '127.0.0.1'); server.unref();
  return { info, close: () => server.close(), server };
}
module.exports = { createShieldBridge, PORT };
