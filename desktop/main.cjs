const { app, BrowserWindow, screen, Tray, Menu, nativeImage, globalShortcut, ipcMain, powerMonitor } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { CompanionMotion } = require('./motion.js');
const windowOptions = require('./window-options.cjs');

if (process.env.BUILDLINGS_TEST_DATA) app.setPath('userData', process.env.BUILDLINGS_TEST_DATA);
const gotLock = app.requestSingleInstanceLock();
let win, tray, motion, frameTimer, lastPosition, settings = { pet: 'sprout', chasing: true, hopping: true };
let hidden = false;
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
function togglePause() { motion.pause(!motion.paused, performance.now()); updateTray(); }
function toggleHidden() { hidden = !hidden; if (hidden) win.hide(); else win.showInactive(); updateTray(); }
function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Buildlings — a tiny desktop friend', enabled: false },
    { type: 'separator' },
    ...['sprout', 'ember', 'orbit'].map(pet => ({ label: pet[0].toUpperCase() + pet.slice(1), type: 'radio', checked: settings.pet === pet, click: () => { settings.pet = pet; saveSettings(); updateTray(); } })),
    { type: 'separator' },
    { label: motion.paused ? 'Resume wandering' : 'Pause wandering', click: togglePause },
    { label: 'Occasionally chase my cursor', type: 'checkbox', checked: settings.chasing, click: item => { settings.chasing = item.checked; motion.chaseEnabled = item.checked; if (!item.checked && motion.mode === 'chase') motion.pause(false, performance.now()); saveSettings(); updateTray(); } },
    { label: 'Playful jumps', type: 'checkbox', checked: settings.hopping, click: item => { settings.hopping = item.checked; motion.hopsEnabled = item.checked; if (!item.checked) motion.hopStart = null; saveSettings(); updateTray(); } },
    { label: 'Bring pet to this screen', click: () => { motion.followCursor(screen.getCursorScreenPoint(), performance.now()); } },
    { label: hidden ? 'Show companion' : 'Hide companion', click: toggleHidden },
    { type: 'separator' },
    { label: 'Quit Buildlings', click: () => app.quit() }
  ]));
}
function frame() {
  if (!win || win.isDestroyed() || hidden) return;
  const next = motion.advance(performance.now(), screen.getCursorScreenPoint());
  if (!lastPosition || lastPosition.x !== next.windowX || lastPosition.y !== next.windowY) {
    win.setPosition(next.windowX, next.windowY, false);
    lastPosition = { x: next.windowX, y: next.windowY };
  }
  win.webContents.send('companion:frame', { ...next, pet: settings.pet });
}
async function createCompanion() {
  loadSettings();
  const cursor = screen.getCursorScreenPoint();
  motion = new CompanionMotion({ areas: areas(), activeId: screen.getDisplayNearestPoint(cursor).id, now: performance.now() });
  motion.chaseEnabled = settings.chasing; motion.hopsEnabled = settings.hopping;
  win = new BrowserWindow(windowOptions(Math.round(motion.x - 130), Math.round(motion.y - 292)));
  win.setMenu(null); win.setHasShadow(false);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Global cursor sampling drives petting; the pet never needs to capture a click.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ipcMain.on('companion:ready', event => {
    if (event.sender !== win.webContents) return;
    win.showInactive(); frame();
    clearInterval(frameTimer); frameTimer = setInterval(frame, 1000 / 60);
  });
  win.on('closed', () => { win = null; clearInterval(frameTimer); app.quit(); });
  screen.on('display-added', () => motion.setAreas(areas()));
  screen.on('display-removed', () => motion.setAreas(areas()));
  screen.on('display-metrics-changed', () => motion.setAreas(areas()));
  powerMonitor.on('resume', () => { motion.lastTime = performance.now(); motion.actionUntil = performance.now() + 1000; });
  if (process.platform === 'darwin') app.dock.hide();
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  tray = new Tray(icon); tray.setToolTip('Buildlings — right-click for controls'); updateTray();
  tray.on('double-click', togglePause);
  for (const [keys, action] of [['CommandOrControl+Alt+P', togglePause], ['CommandOrControl+Alt+H', toggleHidden], ['CommandOrControl+Alt+Q', () => app.quit()]]) {
    if (!globalShortcut.register(keys, action)) console.warn(`Shortcut unavailable: ${keys}. Use the tray menu.`);
  }
  await win.loadFile(path.join(__dirname, 'renderer.html'));
}
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => { if (win) { hidden = false; win.showInactive(); updateTray(); } });
  app.whenReady().then(createCompanion).catch(error => { console.error(error); app.quit(); });
}
app.on('before-quit', () => { clearInterval(frameTimer); globalShortcut.unregisterAll(); });
module.exports = { getRuntime: () => ({ win, motion, settings, hidden }), togglePause, frame, now: () => performance.now() };
// Main-process test access only; no debug controls are exposed to the renderer.
if (process.env.BUILDLINGS_TEST_DATA) app.__buildlingsRuntime = module.exports;
