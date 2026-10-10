const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..');

async function pointer(app, x, y, click = false) {
  if (process.platform === 'win32') ({ x, y } = await app.evaluate(({ screen }, point) => screen.dipToScreenPoint(point), { x: Math.round(x), y: Math.round(y) }));
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(root, 'scripts/test-pointer.py'), String(Math.round(x)), String(Math.round(y)), ...(click ? ['click'] : [])], { encoding: 'utf8', env: process.env });
  if (result.status !== 0) throw new Error(result.stderr || 'Pointer operation failed.');
}
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'buildlings-native-test-'));
  const args = ['.'];
  if (process.platform === 'linux') args.push('--disable-setuid-sandbox', '--use-angle=swiftshader');
  const app = await _electron.launch({ executablePath: require('electron'), args, cwd: root, timeout: 25000, env: { ...process.env, BUILDLINGS_TEST_DATA: temp } });
  const errors = [];
  const output = path.join(root, 'test-results'); await fs.mkdir(output, { recursive: true });
  try {
    const page = await app.firstWindow();
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForFunction(() => window.__buildlingsFrame);
    const config = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return { background: win.getBackgroundColor(), top: win.isAlwaysOnTop(), focusable: win.isFocusable(), resizable: win.isResizable(), shadow: win.hasShadow(), focused: win.isFocused(), bounds: win.getBounds() };
    });
    assert.match(config.background, /^#000000(?:00)?$/); assert.equal(config.top, true);
    assert.equal(config.focusable, false); assert.equal(config.resizable, false); assert.equal(config.shadow, false); assert.equal(config.focused, false);
    console.log('PASS native window is transparent, always on top, unfocusable, and shadowless');
    await page.evaluate(() => { window.__buildlingsEngine.random = () => .5; });
    const renderer = await page.evaluate(() => window.__buildlingsRenderer);
    assert.equal(renderer.type, 'webgl2', JSON.stringify(renderer)); assert.ok(renderer.triangles > 5000); assert.equal(renderer.rigged, true);
    assert.equal(renderer.canvasWidth, 320); assert.equal(renderer.canvasHeight, 370);
    console.log('PASS native GPU renders original rigged 3D geometry in a small transparent canvas');
    const before = await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y }));
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y }));
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 1);
    assert.deepEqual(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.getBounds()), config.bounds);
    console.log('PASS pet moves autonomously while the transparent native surface stays stationary');

    await app.evaluate(({ app }) => app.__buildlingsRuntime.togglePause());
    await page.waitForFunction(() => window.__buildlingsEngine.paused);
    await app.evaluate(async ({ app }) => {
      const { win } = app.__buildlingsRuntime.getRuntime();
      const bitmap = (await win.webContents.capturePage()).toBitmap();
      let transparent = 0, opaque = 0;
      for (let i = 3; i < bitmap.length; i += 4) { if (bitmap[i] === 0) transparent++; if (bitmap[i] > 240) opaque++; }
      if (!transparent || !opaque) throw new Error('Expected a visible sprite surrounded by transparent pixels.');
    });
    console.log('PASS native capture has visible artwork and genuinely transparent surroundings');

    const fixed = await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y }));
    // Electron's Linux/X11 cursor cache depends on window mouse events.
    // Windows checks retain click-through throughout the strokes; Linux
    // checks renderer reactions with events enabled, then restore pass-through.
    if (process.platform === 'linux') await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false));
    await pointer(app, fixed.x - 24, fixed.y - 94); await page.waitForTimeout(70);
    for (let i = 0; i < 10; i++) { await pointer(app, fixed.x + (i % 2 ? 24 : -24), fixed.y - 94); await page.waitForTimeout(80); }
    const petted = await page.evaluate(() => ({ sparkle: window.__buildlingsFrame.sparkleId, mode: window.__buildlingsFrame.mode, particles: window.__buildlingsRenderer.particles, happy: window.__buildlingsRenderer.petWeight }));
    assert.ok(petted.sparkle >= 1); assert.equal(petted.mode, 'pet'); assert.ok(petted.particles > 0); assert.ok(petted.happy > .7);
    console.log(process.platform === 'win32' ? 'PASS global cursor strokes work while Windows clicks pass through' : 'PASS native renderer reacts to cursor strokes (Linux mouse events enabled for this check)');
    await page.screenshot({ path: path.join(output, 'native-pet.png'), omitBackground: true });
    if (process.platform === 'linux') await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(true));

    await app.evaluate(async ({ BrowserWindow, app }) => {
      const { win } = app.__buildlingsRuntime.getRuntime();
      const bounds = win.getBounds();
      const behind = new BrowserWindow({ ...bounds, show: true, frame: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
      await behind.loadURL('data:text/html,' + encodeURIComponent('<html><body style="margin:0;background:#f6f4ed;width:100vw;height:100vh"><button id="target" style="width:100%;height:100%;border:0;background:transparent">Underlying test window</button><script>document.body.dataset.clicks="0";document.querySelector("#target").addEventListener("click",()=>document.body.dataset.clicks=String(Number(document.body.dataset.clicks)+1));</script></body></html>'));
      behind.show();
      app.__behindTest = behind;
    });
    await pointer(app, fixed.x, fixed.y - 94, true); await page.waitForTimeout(250);
    const clicked = await app.evaluate(async ({ app }) => app.__behindTest.webContents.executeJavaScript('document.body.dataset.clicks'));
    assert.equal(clicked, '1');
    assert.equal(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.isFocused()), false);
    console.log('PASS clicking directly through the pet reaches the underlying window without stealing focus');
    await app.evaluate(({ app }) => app.__behindTest.close());

    if (process.platform === 'linux') await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false));
    await pointer(app, fixed.x + 240, fixed.y - 180); await page.waitForTimeout(80);
    await app.evaluate(({ app }) => app.__buildlingsRuntime.command('call'));
    await page.waitForTimeout(400);
    assert.ok(await page.evaluate(() => window.__buildlingsFrame.hop > 1));
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    console.log('PASS native chasing and hopping produce live renderer frames');
    await page.waitForTimeout(900);
    await app.evaluate(({ app }) => app.__buildlingsRuntime.togglePause());
    await app.evaluate(({ app }) => app.__buildlingsRuntime.command('reach'));
    await page.waitForTimeout(1000);
    assert.ok(await page.evaluate(() => window.__buildlingsRenderer.reachWeight) > .85);
    assert.ok(await page.evaluate(() => window.__buildlingsRenderer.pawReach) < -1);
    await page.screenshot({ path: path.join(output, 'native-3d-reach.png'), omitBackground: true });
    console.log('PASS tray command drives a real articulated paw toward the camera');
    assert.deepEqual(errors, []);
    console.log('8 native desktop checks passed. Windows results apply only when this script runs on Windows.');
  } finally { await app.close(); await fs.rm(temp, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
