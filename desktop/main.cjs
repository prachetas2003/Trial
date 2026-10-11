const { app, BrowserWindow, screen, Tray, Menu, nativeImage, globalShortcut, ipcMain, powerMonitor } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const windowOptions = require('./window-options.cjs');
const { FocusCompanion } = require('./focus.js');
const bank = require('./quotes.js');
if (process.env.BUILDLINGS_TEST_DATA) app.setPath('userData', process.env.BUILDLINGS_TEST_DATA);
const gotLock = app.requestSingleInstanceLock();
let win, focusWin, tray, inputTimer, focusTimer, focus, activeId, lastCursor, lastFrame, paused = false, hidden = false, rendererReady = false, quitting = false;
let saveError = '', lastSaved = 0, nextWarmQuote = Date.now() + 45000, trayKey = '';
let settings = { pet: 'monkey', ink: 'black', chasing: true, hopping: true };
const dataPath = name => path.join(app.getPath('userData'), name);
function areas() { return screen.getAllDisplays().map(display => ({ id: display.id, ...display.workArea })); }
function writeData(name, data) {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(dataPath(name + '.tmp'), JSON.stringify(data));
    fs.renameSync(dataPath(name + '.tmp'), dataPath(name)); saveError = '';
  } catch (error) { saveError = 'Your latest changes could not be saved. Keep Mischief open and check that your app-data folder is writable.'; console.error('Could not save companion data:', error.message); }
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
}
function send(input) { if (rendererReady && win && !win.isDestroyed()) win.webContents.send('companion:input', input); }
function presence() {
  const p = focus.preferences;
  return p.presence === 'hidden' ? 'hidden' : p.presence === 'peek' || (p.peekDuringFocus && focus.session?.kind === 'focus') ? 'peek' : 'wander';
}
function snapshot() { return { ...focus.snapshot(), ink: settings.ink, saveError }; }
function state(action) {
  const mode = presence(); hidden = mode === 'hidden';
  send({ areas: areas(), activeId, cursor: screen.getCursorScreenPoint(), settings, paused, visible: !hidden, presence: mode, action });
  if (win && rendererReady) { if (hidden) win.hide(); else if (!win.isVisible()) win.showInactive(); }
}
function broadcastFocus() { if (focusWin && !focusWin.isDestroyed() && focusWin.isVisible()) focusWin.webContents.send('companion:focus-state', snapshot()); }
function processEvents() {
  for (const event of focus.drainEvents()) {
    if (event.type === 'quote') send({ quote: event.quote });
    if (event.type === 'stayed') send({ action: 'ack' });
    if (event.type === 'finished' || event.type === 'break-finished') nextWarmQuote = Date.now() + 5 * 60000;
  }
}
function applyFocus(action) {
  let error = '';
  try {
    if (action?.type === 'appearance') {
      if (!['black', 'white'].includes(action.ink)) throw new Error('Choose a marker colour.');
      settings.ink = action.ink; saveSettings();
    } else focus.dispatch(action);
  } catch (e) { error = e.message; }
  processEvents(); saveFocus(); state(); broadcastFocus(); updateTray();
  return { error, state: snapshot() };
}
function togglePause() { paused = !paused; state(); updateTray(); }
function setPresence(value) { applyFocus({ type: 'preferences', values: { presence: value } }); }
function toggleHidden() {
  const mode = presence();
  applyFocus({ type: 'preferences', values: { presence: mode === 'wander' ? 'peek' : 'wander', ...(mode !== 'wander' && focus.session?.kind === 'focus' ? { peekDuringFocus: false } : {}) } });
}
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
    focus.dispatch({ type: 'preferences', values: { presence: 'wander', ...(focus.session?.kind === 'focus' ? { peekDuringFocus: false } : {}) } }); saveFocus(); broadcastFocus();
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
async function showFocus(view = 'timer') {
  if (!focusWin || focusWin.isDestroyed()) {
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    focusWin = new BrowserWindow({ width: 450, height: Math.min(820, area.height - 30), minWidth: 340, minHeight: 480, icon: path.join(__dirname, 'assets', 'icon.png'), title: 'Mischief — my focus corner', backgroundColor: '#faf7ef', show: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
    secureWindow(focusWin);
    focusWin.on('close', event => { if (!quitting) { event.preventDefault(); focusWin.hide(); } });
    focusWin.on('closed', () => { focusWin = null; });
    await focusWin.loadFile(path.join(__dirname, 'focus.html'));
  }
  if (focusWin.isMinimized()) focusWin.restore();
  focusWin.show(); focusWin.focus(); broadcastFocus(); focusWin.webContents.send('companion:focus-view', view);
}
function stay() { const result = applyFocus({ type: 'stay' }); if (result.error && !focus.session) showFocus(); }
function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  const s = focus.snapshot().session;
  const status = s ? `${s.kind === 'focus' ? 'Focus' : 'Break'} ${s.running ? '' : 'paused · '}${Math.ceil(s.remainingMs / 60000)} min left` : focus.history.length ? 'Your last session is saved' : 'Ready when you are';
  const key = JSON.stringify([status, s?.choices, s?.running, paused, settings, presence()]); if (key === trayKey) return; trayKey = key;
  tray.setToolTip(`Mischief — ${status}${s?.kind === 'focus' ? ` · ${s.choices} choices to stay` : ''}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mischief — your marker monkey', enabled: false }, { label: status, enabled: false }, { type: 'separator' },
    { label: 'Open my focus corner · Ctrl+Alt+F', click: () => showFocus() },
    ...(!s ? [{ label: `Start ${focus.preferences.focusMinutes}-minute focus session`, click: () => applyFocus({ type: 'start' }) }] : [{ label: s.running ? 'Pause timer' : 'Resume timer', click: () => applyFocus({ type: s.running ? 'pause' : 'resume' }) }, { label: s.kind === 'focus' ? 'Finish session' : 'End break', click: () => applyFocus({ type: 'end' }) }]),
    { label: `I’m staying · ${s?.choices || 0} choices · Ctrl+Alt+S`, enabled: s?.kind === 'focus' && s.running, click: stay },
    { label: 'Keep a thought for later · Ctrl+Alt+T', click: () => showFocus('thought') },
    { label: 'A little encouragement', click: () => applyFocus({ type: 'quote', category: 'hard' }) }, { type: 'separator' },
    { label: 'White marker — for dark screens', type: 'checkbox', checked: settings.ink === 'white', click: item => applyFocus({ type: 'appearance', ink: item.checked ? 'white' : 'black' }) },
    { label: paused ? 'Resume wandering' : 'Pause wandering', click: togglePause },
    { label: 'Occasionally chase my cursor', type: 'checkbox', checked: settings.chasing, click: item => { settings.chasing = item.checked; saveSettings(); state(); updateTray(); } },
    { label: 'Playful jumps', type: 'checkbox', checked: settings.hopping, click: item => { settings.hopping = item.checked; saveSettings(); state(); updateTray(); } },
    { label: 'Say hello — reach toward me', click: () => command('reach') },
    { label: 'Bring pet to this screen', click: () => command('call') },
    { label: presence() === 'wander' ? 'Tuck to the screen edge · Ctrl+Alt+H' : 'Let the monkey wander · Ctrl+Alt+H', click: toggleHidden },
    { label: hidden ? 'Show the monkey at the edge' : 'Hide completely', click: () => setPresence(hidden ? 'peek' : 'hidden') }, { type: 'separator' },
    { label: 'Quit Buildlings', click: () => app.quit() }
  ]));
}
function pollCursor() {
  if (hidden || !rendererReady) return;
  const cursor = screen.getCursorScreenPoint();
  if (!lastCursor || cursor.x !== lastCursor.x || cursor.y !== lastCursor.y) { lastCursor = cursor; send({ cursor }); }
}
function tickFocus() {
  focus.tick(Date.now());
  const finished = focus.events.some(e => e.type === 'finished' || e.type === 'break-finished');
  if (Date.now() >= nextWarmQuote) {
    const s = focus.session, p = focus.preferences;
    if (p.autoQuotes && !hidden && (!s || s.kind === 'break' || !p.quietFocus)) focus.quote('everyday');
    nextWarmQuote = Date.now() + (3 + Math.random() * 4) * 60000;
  }
  const hasEvents = focus.events.length > 0;
  processEvents();
  if (finished) state();
  if (hasEvents || (focus.session?.running && Date.now() - lastSaved >= 10000)) saveFocus();
  broadcastFocus(); updateTray();
}
async function createCompanion() {
  loadSettings(); const cursor = screen.getCursorScreenPoint(), display = screen.getDisplayNearestPoint(cursor);
  activeId = display.id; const area = display.workArea;
  win = new BrowserWindow(windowOptions(area.x, area.y, area.width, area.height));
  secureWindow(win); win.setHasShadow(false); win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); win.setIgnoreMouseEvents(true, { forward: true });
  ipcMain.on('companion:ready', event => {
    if (event.sender !== win.webContents) return;
    rendererReady = true; state(); if (!hidden) win.showInactive();
    clearInterval(inputTimer); inputTimer = setInterval(pollCursor, 8);
  });
  ipcMain.handle('companion:focus-state', event => {
    if (event.sender !== focusWin?.webContents && event.sender !== win.webContents) throw new Error('Unknown companion window.');
    return snapshot();
  });
  ipcMain.handle('companion:focus-action', (event, action) => {
    if (event.sender !== focusWin?.webContents) throw new Error('Open the focus corner to change your session.');
    return applyFocus(action);
  });
  ipcMain.on('companion:focus-hide', event => { if (event.sender === focusWin?.webContents) focusWin.hide(); });
  ipcMain.on('companion:report', (event, report) => {
    if (event.sender !== win.webContents || !report || typeof report !== 'object') return;
    if (report.error) { if (tray) tray.setToolTip('Buildlings — Doodle drawing unavailable'); return; }
    if (![report.x, report.y, report.hop, report.sparkleId].every(Number.isFinite) || !areas().some(a => a.id === report.areaId)) return;
    lastFrame = { x: report.x, y: report.y, hop: report.hop, sparkleId: report.sparkleId, areaId: report.areaId, mode: String(report.mode).slice(0, 24), renderer: report.renderer === 'canvas2d' ? 'canvas2d' : 'unavailable' };
    if (report.areaId !== activeId) moveToDisplay(report.areaId);
  });
  win.on('closed', () => { win = null; clearInterval(inputTimer); app.quit(); });
  const refreshDisplays = () => { moveToDisplay(activeId); state(); };
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, refreshDisplays);
  powerMonitor.on('suspend', () => applyFocus({ type: 'pause' }));
  powerMonitor.on('lock-screen', () => applyFocus({ type: 'pause' }));
  powerMonitor.on('resume', () => state('resume'));
  if (process.platform === 'darwin') app.dock.hide();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  updateTray(); tray.on('double-click', () => showFocus());
  for (const [keys, action] of [['CommandOrControl+Alt+P', togglePause], ['CommandOrControl+Alt+H', toggleHidden], ['CommandOrControl+Alt+F', () => showFocus()], ['CommandOrControl+Alt+T', () => showFocus('thought')], ['CommandOrControl+Alt+S', stay], ['CommandOrControl+Alt+Q', () => app.quit()]]) {
    if (!globalShortcut.register(keys, action)) console.warn(`Shortcut unavailable: ${keys}. Use the tray menu.`);
  }
  focusTimer = setInterval(tickFocus, 1000);
  await win.loadFile(path.join(__dirname, 'renderer.html'));
}
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => showFocus());
  app.whenReady().then(createCompanion).catch(error => { console.error(error); app.quit(); });
}
app.on('before-quit', () => { quitting = true; if (focus) { focus.dispatch({ type: 'pause' }); saveFocus(); } clearInterval(inputTimer); clearInterval(focusTimer); globalShortcut.unregisterAll(); });
module.exports = { getRuntime: () => ({ win, focusWin, focus, settings, hidden, paused, lastFrame }), togglePause, toggleHidden, command, state, moveToDisplay, applyFocus, showFocus, tickFocus };
if (process.env.BUILDLINGS_TEST_DATA) app.__buildlingsRuntime = module.exports;
