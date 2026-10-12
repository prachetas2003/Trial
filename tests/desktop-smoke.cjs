const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { _electron } = require('playwright');
const root = path.resolve(__dirname, '..');

async function pointer(app, x, y, click = false) {
  if (process.platform === 'win32') ({ x, y } = await app.evaluate(({ screen }, point) => screen.dipToScreenPoint(point), { x: Math.round(x), y: Math.round(y) }));
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(root, 'scripts/test-pointer.py'), String(Math.round(x)), String(Math.round(y)), ...(click ? [typeof click === 'string' ? click : 'click'] : [])], { encoding: 'utf8', env: process.env });
  if (process.platform === 'linux') await app.evaluate(({ app, screen }, point) => {
    // X11 caches global coordinates in Electron. Supply the coordinates of
    // this real XTest operation; Windows uses the unmodified native API.
    app.__linuxTestCursor = point; screen.getCursorScreenPoint = () => app.__linuxTestCursor;
  }, { x, y });
  if (result.status !== 0) throw new Error(result.stderr || 'Pointer operation failed.');
}
async function clickOverlay(app, page, selector) {
  const point = await page.locator(selector).evaluate(element => { const r = element.getBoundingClientRect(), a = window.__buildlingsEngine.area(); return { x: a.x + r.x + r.width / 2, y: a.y + r.y + r.height / 2 }; });
  await pointer(app, point.x, point.y); await page.waitForTimeout(150);
  if (process.platform === 'linux') await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false));
  await pointer(app, point.x, point.y, true); await page.waitForTimeout(180);
}
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'buildlings-native-test-'));
  const args = ['.'];
  if (process.platform === 'linux') args.push('--disable-setuid-sandbox', '--use-angle=swiftshader');
  const launch = () => _electron.launch({ executablePath: require('electron'), args, cwd: root, timeout: 25000, env: { ...process.env, BUILDLINGS_TEST_DATA: temp } });
  let app = await launch();
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
    await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'preferences', values: { dragEnabled: false } }));
    await page.evaluate(() => { window.__buildlingsEngine.random = () => .5; });
    const renderer = await page.evaluate(() => window.__buildlingsRenderer);
    assert.equal(renderer.type, 'canvas2d', JSON.stringify(renderer)); assert.ok(renderer.strokes > 30); assert.equal(renderer.rigged, true); assert.equal(renderer.art, 'original-marker-monkey');
    assert.equal(renderer.canvasWidth, 320); assert.equal(renderer.canvasHeight, 370);
    console.log('PASS native drawing surface renders the articulated marker monkey in a small transparent canvas');
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
    await page.waitForFunction(() => window.__buildlingsRenderer.petWeight > .7 && window.__buildlingsRenderer.particles > 0, null, { timeout: 3000 });
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
      if (process.platform === 'linux') app.__buildlingsRuntime.getRuntime().win.moveTop();
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
    await page.waitForFunction(() => window.__buildlingsEngine.hopStart === null, null, { timeout: 5000 });
    // Keep the cursor away so petting cannot interrupt this deliberate gesture.
    await pointer(app, config.bounds.x + 30, config.bounds.y + 30); await page.waitForTimeout(150);
    await app.evaluate(({ app }) => app.__buildlingsRuntime.togglePause());
    await app.evaluate(({ app }) => app.__buildlingsRuntime.command('reach'));
    await page.waitForFunction(() => window.__buildlingsRenderer.reachWeight > .95, null, { timeout: 5000 }).catch(async error => { console.log('Reach diagnostics', await page.evaluate(() => ({ frame: window.__buildlingsFrame, reachStart: window.__buildlingsEngine.reachStart, hopStart: window.__buildlingsEngine.hopStart, pettedUntil: window.__buildlingsEngine.pettedUntil, now: performance.now() }))); throw error; });
    assert.ok(await page.evaluate(() => window.__buildlingsRenderer.reachWeight) > .85);
    assert.ok(await page.evaluate(() => window.__buildlingsRenderer.handScale) > 1.6);
    await page.screenshot({ path: path.join(output, 'native-monkey-reach.png'), omitBackground: true });
    console.log('PASS tray command drives an enlarged reaching hand with foreshortening');
    const focusPagePromise = app.waitForEvent('window');
    await clickOverlay(app, page, '#bar-timer');
    const focusPage = await focusPagePromise; focusPage.on('pageerror', error => errors.push(error.message));
    await focusPage.locator('#start-form').waitFor({ state: 'visible' });
    await focusPage.locator('#intention').fill('Finish my own project');
    await focusPage.locator('#focus-minutes').fill('1');
    await focusPage.getByRole('button', { name: 'Start my focus session' }).click();
    await focusPage.locator('#session-controls').waitFor({ state: 'visible' });
    await focusPage.locator('#stay-button').click();
    await focusPage.waitForFunction(() => document.querySelector('#choice-count').textContent === '1');
    await page.waitForFunction(() => !document.querySelector('#speech-bubble').hidden && document.querySelector('.bubble-author').textContent.length > 2);
    assert.equal(await page.locator('#speech-bubble').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
    assert.equal(await page.evaluate(() => window.__buildlingsEngine.presence), 'peek');
    await focusPage.locator('[data-desk-tab=notes]').click();
    await focusPage.locator('#thought-input').fill('An idea I can come back to');
    await focusPage.getByRole('button', { name: 'Keep this for later' }).click();
    await focusPage.locator('[data-desk-tab=focus]').click();
    await focusPage.locator('#session-pause').click();
    await focusPage.waitForFunction(() => document.querySelector('#session-pause').textContent === 'Resume timer');
    await page.waitForFunction(() => window.__buildlingsEngine.presence === 'wander');
    await focusPage.screenshot({ path: path.join(output, 'native-focus-desk.png') });
    await focusPage.locator('.close-desk').click();
    assert.equal(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().focusWin.isVisible()), false);
    const saved = JSON.parse(await fs.readFile(path.join(temp, 'focus-data.json'), 'utf8'));
    assert.equal(saved.session.running, false); assert.equal(saved.session.choices, 1); assert.equal(saved.notes[0].text, 'An idea I can come back to');
    console.log('PASS native focus controls, choice counting, attributed speech, edge presence, thought capture and hideable focus window');

    await app.close(); app = await launch();
    const restored = await app.firstWindow(); await restored.waitForFunction(() => window.__buildlingsFrame);
    const recovered = await app.evaluate(({ app }) => {
      const r = app.__buildlingsRuntime.getRuntime(); return r.focus.snapshot();
    });
    assert.equal(recovered.recovered, true); assert.equal(recovered.session.running, false); assert.equal(recovered.session.choices, 1); assert.equal(recovered.notes[0].text, 'An idea I can come back to');
    assert.equal(recovered.session.elapsedMs, saved.session.elapsedMs);
    await app.evaluate(({ app }) => { const r = app.__buildlingsRuntime; r.applyFocus({ type: 'resume' }); r.getRuntime().focus.session.segmentStartedAt = Date.now() - 61000; r.tickFocus(); r.tickFocus(); });
    const finished = await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().focus.snapshot());
    assert.equal(finished.session, null); assert.equal(finished.history.length, 1); assert.equal(finished.history[0].choices, 1); assert.equal(finished.history[0].completed, true);
    console.log('PASS native disk recovery restores paused timer/notes and records exactly one completed session');
    assert.deepEqual(errors, []);
    await restored.waitForFunction(() => window.__completionSound?.status === 'played');
    assert.equal(await restored.evaluate(() => window.__completionSound.attempts), 1);
    assert.equal(await restored.locator('#timer-bar').evaluate(e => e.classList.contains('has-highlight')), true);
    assert.equal(await restored.evaluate(() => window.__buildlingsEngine.presence), 'wander');
    const summaryPromise = app.waitForEvent('window'); await clickOverlay(app, restored, '#bar-timer');
    const summaryPage = await summaryPromise; await summaryPage.locator('#session-summary').waitFor({ state: 'visible' });
    assert.equal(await summaryPage.locator('#summary-choices').textContent(), '1');
    assert.equal(await restored.locator('#timer-bar').evaluate(e => e.classList.contains('has-highlight')), false);
    await summaryPage.locator('.close-desk').click();
    console.log('PASS native completion audio starts once, highlights glow and real top-bar click opens session summary');
    await app.evaluate(({ app }) => { const r = app.__buildlingsRuntime; r.applyFocus({ type: 'preferences', values: { dragEnabled: true } }); if (!r.getRuntime().paused) r.togglePause(); });
    await restored.waitForFunction(() => !window.__buildlingsEngine.returning);
    await pointer(app, config.bounds.x + 30, config.bounds.y + 110); await restored.waitForTimeout(1800);
    const pet = await restored.evaluate(() => window.__buildlingsFrame);
    await pointer(app, pet.x, pet.y - 94); await restored.waitForTimeout(180);
    if (process.platform === 'linux') await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false));
    await pointer(app, pet.x, pet.y - 94, 'down');
    await restored.waitForFunction(() => window.__buildlingsEngine.dragging, null, { timeout: 4000 });
    for (let i = 1; i <= 10; i++) { await pointer(app, pet.x - i * 14, pet.y - 94 - i * 4); await restored.waitForTimeout(35); }
    const held = await restored.evaluate(() => ({ frame: window.__buildlingsFrame, art: window.__buildlingsRenderer }));
    assert.ok(held.frame.x < pet.x - 110); assert.ok(held.frame.y < pet.y - 30); assert.ok(held.art.dragWeight > .9); assert.ok(Math.abs(held.art.legSwing) > .05);
    await restored.screenshot({ path: path.join(output, 'native-monkey-drag.png'), omitBackground: true });
    await pointer(app, pet.x - 140, pet.y - 134, 'up'); await restored.waitForFunction(() => !window.__buildlingsEngine.dragging);
    assert.equal(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.isFocused()), false);
    await restored.waitForTimeout(1800); assert.ok(await restored.evaluate(() => Math.abs(window.__buildlingsRenderer.legSwing)) < .04);
    console.log('PASS real native drag captures pointer, moves monkey, swings legs, releases and settles without keyboard focus');
    await app.evaluate(async ({ BrowserWindow, app }) => {
      const bounds = app.__buildlingsRuntime.getRuntime().win.getBounds();
      const behind = new BrowserWindow({ ...bounds, show: true, frame: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
      await behind.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;width:100vw;height:100vh;background:#f6f4ed"><script>document.body.dataset.clicks="0";document.body.addEventListener("click",()=>document.body.dataset.clicks=String(Number(document.body.dataset.clicks)+1));</script>'));
      behind.show(); app.__behindTest = behind;
      // The virtual X11 desktop has no window manager to enforce ABOVE.
      if (process.platform === 'linux') app.__buildlingsRuntime.getRuntime().win.moveTop();
    });
    await pointer(app, config.bounds.x + 40, config.bounds.y + 120); await restored.waitForTimeout(180);
    await pointer(app, config.bounds.x + 40, config.bounds.y + 120, true); await restored.waitForTimeout(180);
    assert.equal(await app.evaluate(async ({ app }) => app.__behindTest.webContents.executeJavaScript('document.body.dataset.clicks')), '1');
    if (process.platform === 'win32') {
      const body = await restored.evaluate(() => window.__buildlingsFrame);
      await pointer(app, body.x, body.y - 94); await restored.waitForTimeout(180);
      await pointer(app, body.x, body.y - 94, true); await restored.waitForTimeout(180);
      assert.equal(await app.evaluate(async ({ app }) => app.__behindTest.webContents.executeJavaScript('document.body.dataset.clicks')), '1');
      assert.equal(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.isFocused()), false);
    }
    await app.evaluate(({ app }) => app.__behindTest.close());
    console.log(process.platform === 'win32' ? 'PASS default draggable monkey captures only its body; blank overlay areas click through to another window' : 'PASS Linux blank-space click-through; body capture over another focused window is checked on Windows');
    await clickOverlay(app, restored, '#bar-tuck'); await restored.waitForFunction(() => window.__buildlingsFrame.x > innerWidth - 25);
    const peek = await restored.evaluate(() => window.__buildlingsFrame);
    await pointer(app, Math.min(config.bounds.x + config.bounds.width - 8, peek.x), peek.y - 94); await restored.waitForTimeout(180);
    if (process.platform === 'linux') await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false));
    await pointer(app, peek.x, peek.y - 94, 'down'); await restored.waitForFunction(() => window.__buildlingsEngine.dragging);
    await pointer(app, config.bounds.x + 8, config.bounds.y + 520); await restored.waitForTimeout(350);
    await pointer(app, config.bounds.x + 8, config.bounds.y + 520, 'up'); await restored.waitForFunction(() => !window.__buildlingsEngine.dragging);
    assert.equal(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().focus.preferences.edge), 'left');
    assert.ok(await restored.evaluate(() => window.__buildlingsFrame.x) < config.bounds.x + 25);
    await clickOverlay(app, restored, '#bar-tuck'); await restored.waitForFunction(() => !window.__buildlingsEngine.returning);
    await clickOverlay(app, restored, '#bar-chase'); await pointer(app, config.bounds.x + 1050, config.bounds.y + 450); await restored.waitForTimeout(5500);
    assert.equal(await restored.locator('#bar-chase').getAttribute('aria-pressed'), 'true');
    assert.equal(await restored.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    await clickOverlay(app, restored, '#bar-chase'); assert.equal(await restored.locator('#bar-chase').getAttribute('aria-pressed'), 'false');
    console.log('PASS native edge dragging and retrieval, persistent cursor chase past timeout, and toggle off');
    await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'start' }));
    await clickOverlay(app, restored, '#bar-stay');
    assert.equal(await app.evaluate(({ app }) => app.__buildlingsRuntime.getRuntime().focus.session.choices), 1);
    await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'presence', value: 'hidden' }));
    assert.equal(await restored.locator('#companion-host').isVisible(), false); assert.equal(await restored.locator('#timer-bar').isVisible(), true);
    await clickOverlay(app, restored, '#bar-tuck'); assert.equal(await restored.locator('#companion-host').isVisible(), true);
    console.log('PASS top distraction button records a choice and top controls retrieve a completely hidden monkey');
    const nativeQuoteSchedule = await app.evaluate(({ app }) => {
      const r = app.__buildlingsRuntime;
      const intervals = [];
      for (let i = 0; i < 2; i++) { r.applyFocus({ type: 'quote' }); intervals.push(r.getRuntime().nextWarmQuote - Date.now()); }
      return { intervals, seconds: r.getRuntime().focus.preferences.quoteSeconds, everyday: r.getRuntime().focus.bank.everyday.length, hard: r.getRuntime().focus.bank.hard.length };
    });
    assert.equal(nativeQuoteSchedule.seconds, 12); assert.equal(nativeQuoteSchedule.everyday, 120); assert.equal(nativeQuoteSchedule.hard, 43);
    assert.ok(nativeQuoteSchedule.intervals.every(ms => ms > 11000 && ms <= 12000), JSON.stringify(nativeQuoteSchedule));
    console.log('PASS native balanced 120/43 quote bank and fixed 12-second scheduling without a 25-second minimum');
    await app.evaluate(({ app }) => { const r = app.__buildlingsRuntime; r.applyFocus({ type: 'end' }); r.applyFocus({ type: 'preset', name: 'blocker' }); });
    await restored.waitForFunction(() => document.querySelector('#timer-bar').hidden);
    assert.equal(await restored.locator('#companion-host').isVisible(), false);
    assert.equal(await restored.locator('#speech-bubble').isVisible(), false);
    const refused = await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'start' }));
    assert.match(refused.error, /Connect the browser/); assert.equal(refused.state.session, null);
    await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'preferences', values: { presence: 'wander' } }));
    await restored.waitForFunction(() => document.querySelector('#companion-host').style.visibility === 'visible');
    await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'quote', category: 'hard' }));
    assert.equal(await restored.locator('#speech-bubble').isVisible(), false);
    await app.evaluate(({ app }) => app.__buildlingsRuntime.showFocus());
    const focusPanel = app.windows().find(p => p.url().includes('focus.html'));
    if (!focusPanel) throw new Error('Focus panel unavailable');
    await focusPanel.waitForFunction(() => document.querySelector('#pairing-code')?.value.length === 43);
    assert.equal(await focusPanel.locator('#mode-label').textContent(), 'Custom');
    await focusPanel.locator('[data-mode="companion"]').click();
    await restored.waitForFunction(() => !document.querySelector('#timer-bar').hidden);
    assert.equal(await focusPanel.locator('#mode-label').textContent(), 'Companion');
    console.log('PASS native blocker-only hides all overlays, silent monkey, disconnected-start guard, pairing code and panel presets');
    const pairing = await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'preset', name: 'blocker' }).state.browser.pairingCode);
    const sync = await fetch('http://127.0.0.1:43827/sync', { method: 'POST', headers: { Origin: 'chrome-extension://' + 'a'.repeat(32), 'Content-Type': 'application/json', 'X-Mischief-Key': pairing }, body: JSON.stringify({ clientId: 'native_browser', version: '0.8.0', browser: 'Edge', tabs: [{ id: 42, title: 'My research tab', url: 'https://example.com/work' }] }) });
    assert.equal(sync.status, 200);
    await focusPanel.waitForFunction(() => document.querySelector('#browser-status').textContent.includes('Connected'));
    await focusPanel.locator('[data-desk-tab=blocking]').click();
    await focusPanel.locator('#tab-policy').selectOption('work');
    const needsTab = await app.evaluate(({ app }) => app.__buildlingsRuntime.applyFocus({ type: 'start' }));
    assert.match(needsTab.error, /Select at least one/);
    await focusPanel.getByRole('checkbox', { name: 'Allow: My research tab', exact: true }).check();
    await focusPanel.locator('[data-desk-tab=focus]').click();
    await focusPanel.getByRole('button', { name: 'Start my focus session' }).click();
    const running = await app.evaluate(({ app }) => { const f = app.__buildlingsRuntime.getRuntime().focus; return { running: f.session?.running, selected: f.preferences.shield.workTabs }; });
    assert.equal(running.running, true); assert.deepEqual(running.selected, ['native_browser:42']);
    await app.evaluate(({ app }) => { app.__buildlingsRuntime.applyFocus({ type: 'end' }); app.__buildlingsRuntime.applyFocus({ type: 'preset', name: 'companion' }); });
    console.log('PASS native authenticated browser bridge, live tab panel, strict-workspace guard and selected-tab session start');
    await focusPanel.locator('.close-desk').click();
    await app.evaluate(({ app }) => {
      const r = app.__buildlingsRuntime;
      r.applyFocus({ type:'preferences', values:{monkeyScale:.6,timerOpacity:35,vignette:true,screenStyle:'dark',glowIntensity:70} });
      r.applyFocus({type:'start'}); r.applyFocus({type:'presence',value:'wander'});
      if (!r.getRuntime().paused) r.togglePause();
    });
    await restored.waitForFunction(() => window.__buildlingsFrame.scale === .6 && window.__buildlingsEngine.paused && !window.__buildlingsEngine.returning && window.__buildlingsEngine.hopStart === null && document.body.classList.contains('focus-vignette'));
    assert.ok(Math.abs((await restored.locator('#companion-host').boundingBox()).width - 192) < 1);
    const small = await restored.evaluate(() => window.__buildlingsFrame);
    assert.equal(await restored.evaluate(p=>{const a=window.__buildlingsEngine.area();return !!document.elementFromPoint(p.x-a.x,p.y-a.y-94*.6)?.closest('#pet-grab-zone');},small),true);
    await pointer(app,small.x,small.y-94*.6); await restored.waitForTimeout(180);
    if (process.platform === 'linux') await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false));
    await pointer(app,small.x,small.y-94*.6,'down'); await restored.waitForFunction(()=>window.__buildlingsEngine.dragging);
    await pointer(app,small.x+80,small.y-94*.6+30); await restored.waitForTimeout(180);
    assert.ok(await restored.evaluate(()=>window.__buildlingsFrame.x) > small.x+65);
    await pointer(app,small.x+80,small.y-94*.6+30,'up'); await restored.waitForFunction(()=>!window.__buildlingsEngine.dragging);
    await clickOverlay(app,restored,'#bar-settings');
    await focusPanel.locator('#appearance-view').waitFor({state:'visible'});
    assert.equal(await focusPanel.locator('#monkey-size').inputValue(),'60');
    await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.getRuntime().trayMenu.items.find(i=>i.label==='Hide timer bar').click();});
    await restored.waitForFunction(()=>document.querySelector('#timer-bar').hidden);
    await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.getRuntime().trayMenu.items.find(i=>i.label==='Show timer bar').click();});
    await restored.waitForFunction(()=>!document.querySelector('#timer-bar').hidden);
    await focusPanel.locator('#screen-style').selectOption('light');
    await restored.waitForFunction(()=>document.body.style.getPropertyValue('--glow-rgb')==='40 40 40');
    await focusPanel.screenshot({path:path.join(output,'native-quick-appearance.png')});
    await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.applyFocus({type:'preset',name:'deep'});r.applyFocus({type:'shield',values:{enabled:false}});});
    await focusPanel.locator('#quotes-enabled').check();
    await restored.waitForFunction(()=>!document.querySelector('#speech-bubble').hidden,{},{timeout:5000});
    const speech = await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.preferences);
    assert.equal(speech.autoQuotes,true); assert.equal(speech.quietFocus,false);
    await app.evaluate(({app})=>app.__buildlingsRuntime.applyFocus({type:'pause'}));
    await restored.waitForFunction(()=>window.__buildlingsEngine.presence==='wander');
    await app.evaluate(({app})=>app.__buildlingsRuntime.applyFocus({type:'resume'}));
    await restored.waitForFunction(()=>window.__buildlingsEngine.presence==='peek');
    console.log('PASS native Quotes switch resumes automatic speech after Deep Focus and pause/resume retrieves/restores monkey');

    await app.evaluate(({app})=>app.__buildlingsRuntime.applyFocus({type:'end'}));
    await restored.waitForFunction(()=>!document.body.classList.contains('focus-vignette'));
    console.log('PASS native scaled drag capture, direct appearance controls, tray timer restoration and neutral focus edges');
    console.log('20 native desktop checks passed. Windows results apply only when this script runs on Windows.');
  } finally { await app.close(); await fs.rm(temp, { recursive: true, force: true }); }
})().catch(error => { console.error(error); if(process.env.GITHUB_ACTIONS)console.log('::error title=Native desktop check::'+error.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A')); process.exitCode = 1; });
