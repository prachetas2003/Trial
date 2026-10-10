const { app, BrowserWindow, screen, Tray, Menu, nativeImage, globalShortcut, ipcMain, powerMonitor } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const windowOptions = require('./window-options.cjs');
if (process.env.BUILDLINGS_TEST_DATA) app.setPath('userData', process.env.BUILDLINGS_TEST_DATA);
const gotLock = app.requestSingleInstanceLock();
let win, tray, inputTimer, activeId, lastCursor, lastFrame, paused = false, hidden = false, rendererReady = false;
let settings = { pet: 'sprout', chasing: true, hopping: true };
function areas() { return screen.getAllDisplays().map(display => ({ id: display.id, ...display.workArea })); }
function settingsPath() { return path.join(app.getPath('userData'), 'desktop-settings.json'); }
function saveSettings() {
  try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(settingsPath(), JSON.stringify(settings)); }
  catch (error) { console.error('Could not save companion preferences:', error.message); }
}
function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    if (['sprout', 'ember', 'orbit'].includes(saved.pet)) settings.pet = saved.pet;
    if (typeof saved.chasing === 'boolean') settings.chasing = saved.chasing;
    if (typeof saved.hopping === 'boolean') settings.hopping = saved.hopping;
  } catch (error) { if (error.code !== 'ENOENT') console.error('Could not load companion preferences:', error.message); }
}
function send(input) { if (rendererReady && win && !win.isDestroyed()) win.webContents.send('companion:input', input); }
function state(action) { send({ areas: areas(), activeId, cursor: screen.getCursorScreenPoint(), settings, paused, visible: !hidden, action }); }
function togglePause() { paused = !paused; state(); updateTray(); }
function toggleHidden() { hidden = !hidden; state(); if (hidden) win.hide(); else win.showInactive(); updateTray(); }
function moveToDisplay(id) {
  const area = areas().find(a => a.id === id) || areas()[0];
  if (!area) return;
  const bounds = win.getBounds();
  // The native surface changes only for display changes, never for pet movement.
  if (bounds.x !== area.x || bounds.y !== area.y || bounds.width !== area.width || bounds.height !== area.height) win.setBounds({ x: area.x, y: area.y, width: area.width, height: area.height }, false);
  activeId = area.id;
}
function command(action) { if (action === 'call' || action === 'jump') paused = false; state(action); updateTray(); }
function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Buildlings — your 3D desktop friend', enabled: false }, { type: 'separator' },
    ...['sprout', 'ember', 'orbit'].map(pet => ({ label: pet[0].toUpperCase() + pet.slice(1), type: 'radio', checked: settings.pet === pet,
      click: () => { settings.pet = pet; saveSettings(); state(); updateTray(); } })),
    { type: 'separator' },
    { label: paused ? 'Resume wandering' : 'Pause wandering', click: togglePause },
    { label: 'Occasionally chase my cursor', type: 'checkbox', checked: settings.chasing, click: item => { settings.chasing = item.checked; saveSettings(); state(); updateTray(); } },
    { label: 'Playful jumps', type: 'checkbox', checked: settings.hopping, click: item => { settings.hopping = item.checked; saveSettings(); state(); updateTray(); } },
    { label: 'Say hello — reach toward me', click: () => command('reach') },
    { label: 'Bring pet to this screen', click: () => command('call') },
    { label: hidden ? 'Show companion' : 'Hide companion', click: toggleHidden }, { type: 'separator' },
    { label: 'Quit Buildlings', click: () => app.quit() }
  ]));
}
function pollCursor() {
  if (hidden || !rendererReady) return;
  const cursor = screen.getCursorScreenPoint();
  if (!lastCursor || cursor.x !== lastCursor.x || cursor.y !== lastCursor.y) { lastCursor = cursor; send({ cursor }); }
}
async function createCompanion() {
  loadSettings(); const cursor = screen.getCursorScreenPoint(), display = screen.getDisplayNearestPoint(cursor);
  activeId = display.id; const area = display.workArea;
  win = new BrowserWindow(windowOptions(area.x, area.y, area.width, area.height));
  win.setMenu(null); win.setHasShadow(false); win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ipcMain.on('companion:ready', event => {
    if (event.sender !== win.webContents) return;
    rendererReady = true; state(); win.showInactive();
    clearInterval(inputTimer); inputTimer = setInterval(pollCursor, 8);
  });
  ipcMain.on('companion:report', (event, report) => {
    if (event.sender !== win.webContents || !report || typeof report !== 'object') return;
    if (report.error) { if (tray) tray.setToolTip('Buildlings — 3D graphics unavailable'); return; }
    if (![report.x, report.y, report.hop, report.sparkleId].every(Number.isFinite) || !areas().some(a => a.id === report.areaId)) return;
    lastFrame = { x: report.x, y: report.y, hop: report.hop, sparkleId: report.sparkleId, areaId: report.areaId, mode: String(report.mode).slice(0, 24), renderer: report.renderer === 'webgl2' ? 'webgl2' : 'unavailable' };
    if (report.areaId !== activeId) moveToDisplay(report.areaId);
  });
  win.on('closed', () => { win = null; clearInterval(inputTimer); app.quit(); });
  const refreshDisplays = () => { moveToDisplay(activeId); state(); };
  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(event, refreshDisplays);
  powerMonitor.on('resume', () => state('resume'));
  if (process.platform === 'darwin') app.dock.hide();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  tray.setToolTip('Buildlings — right-click for controls'); updateTray(); tray.on('double-click', togglePause);
  for (const [keys, action] of [['CommandOrControl+Alt+P', togglePause], ['CommandOrControl+Alt+H', toggleHidden], ['CommandOrControl+Alt+Q', () => app.quit()]]) {
    if (!globalShortcut.register(keys, action)) console.warn(`Shortcut unavailable: ${keys}. Use the tray menu.`);
  }
  await win.loadFile(path.join(__dirname, 'renderer.html'));
}
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => { if (win) { hidden = false; state(); win.showInactive(); updateTray(); } });
  app.whenReady().then(createCompanion).catch(error => { console.error(error); app.quit(); });
}
app.on('before-quit', () => { clearInterval(inputTimer); globalShortcut.unregisterAll(); });
module.exports = { getRuntime: () => ({ win, settings, hidden, paused, lastFrame }), togglePause, command, state, moveToDisplay };
if (process.env.BUILDLINGS_TEST_DATA) app.__buildlingsRuntime = module.exports;
