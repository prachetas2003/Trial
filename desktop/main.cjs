const { app, BrowserWindow, screen, Tray, Menu, nativeImage, globalShortcut, ipcMain, powerMonitor, shell, clipboard } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const windowOptions = require('./window-options.cjs');
const { FocusCompanion } = require('./focus.js');
const bank = require('./quotes.js');
const { createShieldBridge } = require('./shield-bridge.cjs');
const crypto = require('node:crypto');
const { createStorage } = require('./storage.cjs');
const safeMode = process.argv.includes('--safe-mode');
// A 2D companion does not need a GPU-backed transparent Windows surface.
// Use software compositing by default to avoid competing with browser video planes.
const softwareGraphics = safeMode || process.platform === 'win32';
if (softwareGraphics) app.disableHardwareAcceleration();
let storage, quitReady = false, overlayRecoveries = 0, recovering = false, overlayHealthySince = 0, recoveryLimitNotified = false;
let shieldBridge, trayMenu, displayAreas, wakeTimer, lastFrameAt = 0, suspended = false, panelBeforeSleep = false;
if (process.env.BUILDLINGS_TEST_DATA) app.setPath('userData', process.env.BUILDLINGS_TEST_DATA);
const gotLock = app.requestSingleInstanceLock();
let win, focusWin, tray, inputTimer, focusTimer, focus, activeId, lastCursor, lastFrame, paused = false, hidden = false, rendererReady = false, quitting = false;
let saveError = '', lastSaved = 0, nextWarmQuote = Date.now() + 12000, trayKey = '';
let dragging = false, interactive = false, hudRect = null, highlight = null;
const quoteDelay = () => focus.preferences.quoteSeconds * 1000;
let settings = { pet: 'monkey', ink: 'black', chasing: true, hopping: true };
const dataPath = name => path.join(app.getPath('userData'), name);
function areas() { return displayAreas ||= screen.getAllDisplays().map(display => ({ id: display.id, ...display.workArea })); }
function writeData(name, data) { storage.write(name, data); }
const diagnostics = [];
function diagnostic(type, details = {}) {
  diagnostics.push({ at: new Date().toISOString(), type, ...details });
  if (diagnostics.length > 100) diagnostics.shift();
  storage?.write('diagnostics.json', { version: app.getVersion(), platform: process.platform, safeMode, softwareGraphics, events: diagnostics });
}
async function restartOverlay(manual = false, reason = 'renderer') {
  if (quitting || recovering || !win || win.isDestroyed()) return;
  if (manual) {overlayRecoveries=0;recoveryLimitNotified=false;}
  if (reason !== 'wake' && overlayRecoveries >= 2) { if(!recoveryLimitNotified)diagnostic('overlay-recovery-limit'); recoveryLimitNotified=true; return; }
  if (reason !== 'wake') overlayRecoveries++;
  recovering = true; rendererReady = false; lastFrameAt = Date.now();
  clearInterval(inputTimer);
  dragging = false; hudRect = null; lastFrame = null; lastCursor = null;
  interactive = false; win.setIgnoreMouseEvents(true, { forward: true });
  focus.dispatch({ type: 'pause' }); saveFocus(); broadcastFocus(); updateTray();
  const previous=win;
  try {
    const area=areas().find(a=>a.id===activeId) || areas()[0];
    if(!area)throw new Error('No active display');
    activeId=area.id; win=createOverlayWindow(area); previous.destroy();
    await win.loadFile(path.join(__dirname, 'renderer.html')); diagnostic('overlay-reloaded', {reason});
  }
  catch (error) { diagnostic('overlay-load-failed', { code: error.code || 'load' }); if(!previous.isDestroyed()){win=previous;win.webContents.reload();} }
  finally { recovering = false; }
}
function sleepDesktop(reason) {
  if (suspended) return;
  suspended=true; panelBeforeSleep=!!focusWin?.isVisible();
  applyFocus({type:'pause'}); clearInterval(inputTimer); dragging=false; interactive=false;
  if(win && !win.isDestroyed()){win.setIgnoreMouseEvents(true,{forward:true});win.hide();}
  send({visible:false}); focusWin?.hide(); diagnostic('desktop-suspended', {reason});
}
function wakeDesktop() {
  // Windows can send resume, unlock and display changes together. Rebuild once.
  clearTimeout(wakeTimer);
  wakeTimer=setTimeout(async()=>{
    if(quitting)return;
    suspended=false; displayAreas=null; nextWarmQuote=Date.now()+quoteDelay();
    const reopen=panelBeforeSleep; panelBeforeSleep=false;
    const stale=focusWin; focusWin=null; focusLoading=null; stale?.destroy();
    try {
      await restartOverlay(false,'wake');
      if(reopen)await showFocus();
      diagnostic('desktop-resumed');
    } catch(error) {diagnostic('wake-failed',{code:error.code||'wake'});showFocus();}
  },250);
}
function readData(name) {
  try { return JSON.parse(fs.readFileSync(dataPath(name), 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Could not load companion data:', error.message);
      if (error instanceof SyntaxError) {
        try { fs.copyFileSync(dataPath(name), dataPath(`${name}.unreadable-${Date.now()}.json`)); }
        catch { /* Keep the original if a backup cannot be written. */ }
      }
      saveError = 'Saved data could not be read. An unreadable copy is kept in your app-data folder when possible.';
    }
    return {};
  }
}
function saveSettings() { writeData('desktop-settings.json', settings); }
function saveFocus() { writeData('focus-data.json', focus.export()); lastSaved = Date.now(); }
function loadSettings() {
  const saved = readData('desktop-settings.json');
  if (['black', 'white'].includes(saved?.ink)) settings.ink = saved.ink;
  if (typeof saved?.chasing === 'boolean') settings.chasing = saved.chasing;
  if (typeof saved?.hopping === 'boolean') settings.hopping = saved.hopping;
  focus = new FocusCompanion({ saved: readData('focus-data.json') || {}, bank });
  nextWarmQuote = Date.now() + quoteDelay();
}
function send(input) { if (rendererReady && win && !win.isDestroyed()) win.webContents.send('companion:input', input); }
function presence() { return focus.presence(); }
function snapshot() { return { ...focus.snapshot(), safeMode, softwareGraphics, ink: settings.ink, saveError, highlight, browser: shieldBridge?.info() }; }
function state(action) {
  const mode = presence(); hidden = mode === 'hidden';
  send({ areas: areas(), activeId, cursor: screen.getCursorScreenPoint(), settings, paused, visible: !hidden && !suspended, presence: mode, preferences: focus.preferences, safeMode, action });
  if (win && rendererReady && !suspended) { if (!win.isVisible()) win.showInactive(); }
}
function broadcastFocus(packet = snapshot()) { if (rendererReady && win && !win.isDestroyed()) win.webContents.send('companion:focus-state', packet); if (focusWin && !focusWin.isDestroyed()) focusWin.webContents.send('companion:focus-state', packet); }
function processEvents() {
  for (const event of focus.drainEvents()) {
    if (event.type === 'quote') { send({ quote: event.quote }); nextWarmQuote = Date.now() + quoteDelay(); }
    if (event.type === 'milestone') send({ celebration: {id:event.id + ':' + event.percent, kind:'milestone', percent:event.percent} });
    if (event.type === 'stayed') send({ action: 'ack' });
    if (event.type === 'finished' || event.type === 'break-finished') {
      highlight = { kind: event.type === 'finished' ? 'focus' : 'break', id: event.summary?.id || event.id, completed: event.summary?.completed ?? event.completed };
      send({ completion: { ...highlight, completed: event.summary?.completed ?? event.completed, sound: focus.preferences.completionSound } });
    }
  }
}
function applyFocus(action) {
  let error = '';
  try {
    if (action?.type === 'copy-pairing') {
      clipboard.writeText(shieldBridge.info().pairingCode);
    } else if (action?.type === 'browser-folder') {
      const folder = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'FocusShield') : path.join(__dirname, '../extension');
      shell.openPath(folder).then(error => { if (error) console.error('Could not open extension folder.'); });
    } else if (action?.type === 'appearance') {
      if (!['black', 'white'].includes(action.ink)) throw new Error('Choose a marker colour.');
      settings.ink = action.ink; saveSettings();
    } else {
      if ((action?.type === 'start' && action.kind !== 'break') || action?.type === 'resume') {
        const p = focus.preferences.shield;
        if (p.enabled && (!focus.session || focus.session.kind === 'focus')) {
          const browser = shieldBridge?.info();
          if (!browser?.connected) throw new Error('Connect the browser extension before starting with Focus Shield, or turn blocking off.');
          if (browser.outdated) throw new Error('Reload the updated FocusShield extension in your browser before using blocking.');
          if (p.onlyWorkTabs && !browser.tabs.some(t => p.workTabs.includes(t.key))) throw new Error('Select at least one currently open work tab.');
        }
      }
      focus.dispatch(action);
    }
    if (action?.type === 'start') highlight = null;
    if (action?.type === 'chase' && focus.preferences.chaseCursor) paused = false;
    if (action?.type === 'preferences' && 'quoteSeconds' in (action.values || {})) nextWarmQuote = Date.now() + quoteDelay();
    if (action?.type === 'preferences' && action.values?.quotesEnabled === true) nextWarmQuote = Date.now() + 1000;
  } catch (e) { error = e.message; }
  state(); processEvents(); saveFocus(); const packet=snapshot(); broadcastFocus(packet); updateTray();
  return { error, state: packet };
}
function togglePause() { paused = !paused; state(); updateTray(); }
function setPresence(value) { applyFocus({ type: 'presence', value }); }
function toggleHidden() { setPresence(presence() === 'wander' ? 'peek' : 'wander'); }
function moveToDisplay(id) {
  const area = areas().find(a => a.id === id) || areas()[0];
  if (!area || !win) return;
  const bounds = win.getBounds();
  if (bounds.x !== area.x || bounds.y !== area.y || bounds.width !== area.width || bounds.height !== area.height) win.setBounds({ x: area.x, y: area.y, width: area.width, height: area.height }, false);
  activeId = area.id;
}
function command(action) {
  if (action === 'call') {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()); moveToDisplay(display.id);
    focus.dispatch({ type: 'presence', value: 'wander' }); saveFocus(); broadcastFocus();
  }
  if (action === 'call' || action === 'jump') paused = false;
  state(action); updateTray();
}
function secureWindow(window) {
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
}
let focusLoading, panelRecoveries = 0;
function discardPanel(panel) {
  if (focusWin!==panel) return;
  const reopen=panel.isVisible(); focusWin=null; focusLoading=null; panel.destroy();
  if(reopen && !suspended && panelRecoveries++<2)showFocus('timer',true);
}
async function showFocus(view = 'timer', recovery = false) {
  if(!recovery)panelRecoveries=0;
  highlight = null; broadcastFocus();
  if (!focusWin || focusWin.isDestroyed()) {
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    focusWin = new BrowserWindow({ width: 450, height: Math.min(820, area.height - 30), minWidth: 340, minHeight: 480, icon: path.join(__dirname, 'assets', 'icon.png'), title: 'Mischief — my focus corner', backgroundColor: '#faf7ef', show: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
    secureWindow(focusWin);
    const panel=focusWin;
    panel.on('close', event => { if (!quitting) { event.preventDefault(); panel.hide(); } });
    panel.on('closed', () => { if(focusWin===panel){focusWin=null;focusLoading=null;} });
    focusLoading = focusWin.loadFile(path.join(__dirname, 'focus.html'));
    panel.webContents.on('render-process-gone', (_event, details) => { diagnostic('panel-gone', { reason: details.reason }); discardPanel(panel); });
    panel.on('unresponsive', () => {diagnostic('panel-unresponsive');discardPanel(panel);});
  }
  const panel=focusWin, loading=focusLoading;
  try { if (loading) await loading; }
  catch (error) {
    diagnostic('panel-load-failed', { code: error.code || 'load' });
    if(focusWin===panel){focusWin=null;focusLoading=null;panel?.destroy();}
    return;
  }
  if (focusWin!==panel || !panel || panel.isDestroyed() || suspended) return;
  if (panel.isMinimized()) panel.restore();
  panel.show(); panel.focus(); broadcastFocus(); panel.webContents.send('companion:focus-view', view);
}
function stay() { const result = applyFocus({ type: 'stay' }); if (result.error && !focus.session) showFocus(); }
function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  const s = focus.snapshot().session;
  const status = s ? `${s.kind === 'focus' ? 'Focus' : 'Break'} ${s.running ? '' : 'paused · '}${Math.ceil(s.remainingMs / 60000)} min left` : focus.history.length ? 'Your last session is saved' : 'Ready when you are';
  const key = JSON.stringify([status, s?.choices, s?.running, paused, settings, presence(), focus.preferences.showHud, focus.preferences.quotesEnabled, focus.preferences.chaseCursor, focus.preferences.dragEnabled]); if (key === trayKey) return; trayKey = key;
  tray.setToolTip(`Mischief — ${status}${s?.kind === 'focus' ? ` · ${s.choices} choices to stay` : ''}`);
  trayMenu = Menu.buildFromTemplate([
    { label: 'Mischief — your marker monkey', enabled: false }, { label: status, enabled: false }, { type: 'separator' },
    { label: 'Open controls · Ctrl+Alt+F', click: () => showFocus() },
    { label: focus.preferences.showHud ? 'Hide timer bar' : 'Show timer bar', click: () => applyFocus({ type: 'preferences', values: { showHud: !focus.preferences.showHud } }) },
    { label: presence() === 'hidden' ? 'Show monkey' : 'Hide monkey', click: () => setPresence(presence() === 'hidden' ? focus.preferences.lastPresence : 'hidden') },
    { label: 'Quick appearance controls', click: () => showFocus('appearance') },
    ...(!s ? [{ label: `Start ${focus.preferences.focusMinutes}-minute focus session`, click: () => applyFocus({ type: 'start' }) }] : [{ label: s.running ? 'Pause timer' : 'Resume timer', click: () => applyFocus({ type: s.running ? 'pause' : 'resume' }) }, { label: s.kind === 'focus' ? 'Finish session' : 'End break', click: () => applyFocus({ type: 'end' }) }]),
    { label: `I’m staying · ${s?.choices || 0} choices · Ctrl+Alt+S`, enabled: s?.kind === 'focus' && s.running, click: stay },
    { label: 'Keep a thought for later · Ctrl+Alt+T', click: () => showFocus('thought') },
    { label: 'Show monkey quotes', type: 'checkbox', checked: focus.preferences.quotesEnabled, click: item => applyFocus({ type: 'preferences', values: { quotesEnabled: item.checked } }) },
    { label: 'A little encouragement', enabled: focus.preferences.quotesEnabled, click: () => applyFocus({ type: 'quote', category: 'hard' }) }, { type: 'separator' },
    { label: 'White marker — for dark screens', type: 'checkbox', checked: settings.ink === 'white', click: item => applyFocus({ type: 'appearance', ink: item.checked ? 'white' : 'black' }) },
    { label: paused ? 'Resume wandering' : 'Pause wandering', click: togglePause },
    { label: 'Keep chasing my cursor', type: 'checkbox', checked: focus.preferences.chaseCursor, click: item => applyFocus({ type: 'chase', enabled: item.checked }) },
    { label: 'Drag the monkey with my mouse', type: 'checkbox', checked: focus.preferences.dragEnabled, click: item => applyFocus({ type: 'preferences', values: { dragEnabled: item.checked } }) },
    { label: 'Occasionally chase my cursor', type: 'checkbox', checked: settings.chasing, click: item => { settings.chasing = item.checked; saveSettings(); state(); updateTray(); } },
    { label: 'Playful jumps', type: 'checkbox', checked: settings.hopping, click: item => { settings.hopping = item.checked; saveSettings(); state(); updateTray(); } },
    { label: 'Say hello — reach toward me', click: () => command('reach') },
    { label: 'Bring pet to this screen', click: () => command('call') },
    { label: presence() === 'wander' ? 'Tuck to the screen edge · Ctrl+Alt+H' : 'Let the monkey wander · Ctrl+Alt+H', click: toggleHidden },
    { label: hidden ? 'Show the monkey at the edge' : 'Hide completely', click: () => setPresence(hidden ? 'peek' : 'hidden') }, { type: 'separator' },
    { label: 'Restart desktop overlay', click: () => restartOverlay(true) },
    { label: 'Open local diagnostics', click: () => { storage.flush().then(() => shell.openPath(dataPath('diagnostics.json'))); } },
    { label: 'Quit Buildlings', click: () => app.quit() }
  ]);
  tray.setContextMenu(trayMenu);
}
function setInteractive(value) {
  if (!win || win.isDestroyed() || value === interactive) return;
  value = !suspended && value;
  interactive = value; win.setIgnoreMouseEvents(!value, { forward: true });
}
function updateInteractive(cursor = screen.getCursorScreenPoint()) {
  const inBar = focus.preferences.showHud && hudRect && cursor.x >= hudRect.x && cursor.x <= hudRect.x + hudRect.width && cursor.y >= hudRect.y && cursor.y <= hudRect.y + hudRect.height;
  const inPet = !hidden && focus.preferences.dragEnabled && lastFrame && ((cursor.x - lastFrame.x) / (74 * lastFrame.scale)) ** 2 + ((cursor.y - (lastFrame.y - 94 * lastFrame.scale - lastFrame.hop)) / (86 * lastFrame.scale)) ** 2 <= 1;
  setInteractive(!!(dragging || inBar || inPet));
}
function pollCursor() {
  if (!rendererReady || suspended) return;
  const cursor = screen.getCursorScreenPoint();
  updateInteractive(cursor);
  if (!lastCursor || cursor.x !== lastCursor.x || cursor.y !== lastCursor.y) { lastCursor = cursor; send({ cursor }); }
}
function tickFocus() {
  focus.tick(Date.now());
  const finished = focus.events.some(e => e.type === 'finished' || e.type === 'break-finished');
  if (Date.now() >= nextWarmQuote && !focus.events.some(e => e.type === 'quote')) {
    const s = focus.session, p = focus.preferences;
    if (p.autoQuotes && !hidden && (!s || s.kind === 'break' || !s.running || !p.quietFocus)) focus.quote('everyday');
    nextWarmQuote = Date.now() + quoteDelay();
  }
  const hasEvents = focus.events.length > 0;
  if (finished) state();
  processEvents();
  if (hasEvents || (focus.session?.running && Date.now() - lastSaved >= 10000)) saveFocus();
  broadcastFocus(); updateTray();
}
function createOverlayWindow(area) {
  const surface=new BrowserWindow(windowOptions(area.x, area.y, area.width, area.height));
  surface.webContents.on('render-process-gone', (_event, details) => { if (win===surface) { diagnostic('overlay-gone', {reason:details.reason}); restartOverlay(); } });
  surface.on('unresponsive', () => { if (win===surface) { diagnostic('overlay-unresponsive'); restartOverlay(); } });
  secureWindow(surface); surface.setHasShadow(false); surface.setAlwaysOnTop(true,'floating');
  surface.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true}); surface.setIgnoreMouseEvents(true,{forward:true});
  surface.on('closed', () => { if (win===surface) {win=null;clearInterval(inputTimer);app.quit();} });
  return surface;
}
async function createCompanion() {
  const failedSaves=new Set();
  storage = createStorage(app.getPath('userData'), {
    onError: (error,name) => { failedSaves.add(name); saveError = 'Changes could not be saved. Check that your app-data folder is writable.'; console.error('Could not save companion data:', error.code || 'write'); },
    onSaved: name => { failedSaves.delete(name); if (!failedSaves.size) saveError = ''; }
  });
  diagnostic('started');
  loadSettings();
  const savedBridge = readData('browser-pairing.json');
  const token = typeof savedBridge?.token === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(savedBridge.token) ? savedBridge.token : crypto.randomBytes(32).toString('base64url');
  writeData('browser-pairing.json', { token });
  shieldBridge = createShieldBridge({ token, getState: () => focus.snapshot(), action: applyFocus });
  const cursor = screen.getCursorScreenPoint(), display = screen.getDisplayNearestPoint(cursor);
  activeId = display.id; lastFrameAt=Date.now(); const area = display.workArea;
  win = createOverlayWindow(area);
  ipcMain.on('companion:ready', event => {
    if (event.sender !== win?.webContents) return;
    rendererReady = true; overlayHealthySince=lastFrameAt=Date.now(); state(); broadcastFocus();
    if(!suspended)win.showInactive();
    clearInterval(inputTimer); if(!suspended)inputTimer = setInterval(pollCursor, 8);
  });
  ipcMain.handle('companion:focus-state', event => {
    if (event.sender !== focusWin?.webContents && event.sender !== win?.webContents) throw new Error('Unknown companion window.');
    return snapshot();
  });
  ipcMain.handle('companion:focus-action', (event, action) => {
    if (event.sender !== focusWin?.webContents && event.sender !== win?.webContents) throw new Error('Unknown companion window.');
    return applyFocus(action);
  });
  ipcMain.on('companion:open-focus', (event, view) => { if (event.sender === win?.webContents) showFocus(['timer', 'thought', 'summary', 'appearance', 'blocking'].includes(view) ? view : 'timer'); });
  ipcMain.on('companion:dragging', (event, value) => { if (event.sender !== win?.webContents || typeof value !== 'boolean') return; dragging = value; updateInteractive(); });
  ipcMain.on('companion:interactive', (event, value) => { if (event.sender !== win?.webContents || typeof value !== 'boolean') return; updateInteractive(); });
  ipcMain.on('companion:focus-hide', event => { if (event.sender === focusWin?.webContents) focusWin.hide(); });
  ipcMain.on('companion:diagnostic', (event, value) => {
    if (event.sender !== win?.webContents || !value || typeof value !== 'object') return;
    if (['frame-stall','renderer-error'].includes(value.type)) diagnostic(value.type, { duration: Number.isFinite(value.duration) ? Math.min(60000, value.duration) : 0 });
  });
  ipcMain.on('companion:report', (event, report) => {
    if (suspended || event.sender !== win?.webContents || !report || typeof report !== 'object') return;
    if (report.error) { if (tray) tray.setToolTip('Buildlings — Doodle drawing unavailable'); return; }
    if (![report.x, report.y, report.hop, report.sparkleId].every(Number.isFinite) || !areas().some(a => a.id === report.areaId)) return;
    lastFrameAt=Date.now();
    if(lastFrameAt-overlayHealthySince>60000){overlayRecoveries=0;recoveryLimitNotified=false;}
    lastFrame = { scale: Number.isFinite(report.scale) && report.scale >= .6 && report.scale <= 1 ? report.scale : 1, x: report.x, y: report.y, hop: report.hop, sparkleId: report.sparkleId, areaId: report.areaId, mode: String(report.mode).slice(0, 24), renderer: report.renderer === 'canvas2d' ? 'canvas2d' : 'unavailable' };
    const r = report.hudRect, a = areas().find(a => a.id === report.areaId);
    if (r && [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.width <= a.width && r.height > 0 && r.height <= 120 && r.x >= a.x && r.y >= a.y && r.x + r.width <= a.x + a.width) hudRect = { ...r };
    updateInteractive();
    if (report.areaId !== activeId) moveToDisplay(report.areaId);
  });
  const refreshDisplays = () => { displayAreas=null; if(!suspended){moveToDisplay(activeId); state();} };
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, refreshDisplays);
  powerMonitor.on('suspend', () => sleepDesktop('sleep'));
  powerMonitor.on('lock-screen', () => sleepDesktop('lock'));
  powerMonitor.on('resume', wakeDesktop);
  powerMonitor.on('unlock-screen', wakeDesktop);
  if (process.platform === 'darwin') app.dock.hide();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  updateTray(); tray.on('double-click', () => showFocus());
  for (const [keys, action] of [['CommandOrControl+Alt+P', togglePause], ['CommandOrControl+Alt+H', toggleHidden], ['CommandOrControl+Alt+F', () => showFocus()], ['CommandOrControl+Alt+T', () => showFocus('thought')], ['CommandOrControl+Alt+S', stay], ['CommandOrControl+Alt+Q', () => app.quit()]]) {
    if (!globalShortcut.register(keys, action)) { diagnostic('shortcut-unavailable', {keys}); console.warn(`Shortcut unavailable: ${keys}. Use the tray menu.`); }
  }
  let lastTick=Date.now();
  focusTimer = setInterval(() => { const now=Date.now(); if (!suspended && now-lastTick > 2000) diagnostic('main-stall', {duration:now-lastTick}); lastTick=now;
    if(suspended)return;
    if(!recovering && now-lastFrameAt>8000)restartOverlay(false,'heartbeat');
    tickFocus(); }, 1000);
  diagnostic('graphics-status', { features: app.getGPUFeatureStatus(), displays: screen.getAllDisplays().map(d=>({width:d.size.width,height:d.size.height,scale:d.scaleFactor})) });
  await win.loadFile(path.join(__dirname, 'renderer.html'));
  // Always provide a visible entry point, even when saved settings hide every overlay.
  await showFocus();
}
app.on('child-process-gone', (_event, details) => diagnostic('child-gone', {reason:details.reason,kind:details.type}));
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => showFocus());
  app.whenReady().then(createCompanion).catch(error => { console.error(error); app.quit(); });
}
app.on('before-quit', event => {
  if (quitReady) return;
  event.preventDefault();
  if (quitting) return;
  quitting = true;
  clearInterval(inputTimer); clearInterval(focusTimer); clearTimeout(wakeTimer); globalShortcut.unregisterAll(); shieldBridge?.close();
  if (focus) { focus.dispatch({ type: 'pause' }); saveFocus(); }
  diagnostic('quit');
  Promise.resolve(storage?.flush()).finally(() => { quitReady = true; app.quit(); });
});
module.exports = { getRuntime: () => ({ win, focusWin, focus, trayMenu, settings, hidden, paused, lastFrame, dragging, interactive, hudRect, highlight, nextWarmQuote, storage, safeMode, softwareGraphics, suspended, diagnostics }), togglePause, toggleHidden, command, state, moveToDisplay, applyFocus, showFocus, tickFocus };
if (process.env.BUILDLINGS_TEST_DATA) app.__buildlingsRuntime = module.exports;
