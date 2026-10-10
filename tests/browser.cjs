const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const errors = [];
  const requests = [];
  const results = [];
  const output = path.resolve('test-results');
  await fs.mkdir(output, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  async function check(label, fn) { await fn(); results.push(label); console.log(`PASS ${label}`); }
  try {
    await page.clock.install();
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');
    await check('fresh collection shows only Sprout as available', async () => {
      assert.equal(await page.getByRole('button', { name: 'Choose Sprout', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.collection-card.locked button').count(), 2);
      assert.equal(await page.locator('.collection-card.locked button').first().isDisabled(), true);
    });
    await check('repeated timer ticks preserve SVG nodes so animations continue', async () => {
      await page.evaluate(() => window.originalPetNode = document.querySelector('#pet-art svg'));
      await page.clock.runFor(2000);
      assert.equal(await page.evaluate(() => document.querySelector('#pet-art svg') === window.originalPetNode), true);
    });
    await check('booping responds without starting a build', async () => {
      await page.getByRole('button', { name: 'Give Sprout a little boop' }).click();
      assert.notEqual(await page.locator('#pet-message').textContent(), 'Oh hi. Shall we make something?');
      assert.equal(await page.locator('#build-count').textContent(), '0 shipped');
    });
    await check('pause and resume retain remaining time', async () => {
      await page.getByRole('button', { name: /Try a 20-second build/ }).click();
      await page.clock.runFor(3000);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      const paused = await page.locator('#timer').textContent();
      await page.clock.runFor(10000);
      assert.equal(await page.locator('#timer').textContent(), paused);
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.clock.runFor(18000);
      assert.equal(await page.locator('#timer').textContent(), '00:00');
      assert.equal(await page.getByRole('button', { name: 'Pause', exact: true }).isDisabled(), true);
      assert.equal(await page.locator('#build-count').textContent(), '0 shipped');
    });
    await check('shipping unlocks Ember, and selection persists after reload', async () => {
      await page.getByRole('button', { name: 'I shipped it!', exact: false }).click();
      assert.equal(await page.locator('#build-count').textContent(), '1 shipped');
      await page.getByRole('button', { name: 'Choose Ember', exact: true }).click();
      await page.reload();
      assert.match(await page.locator('#pet-name').textContent(), /Ember/);
      assert.equal(await page.locator('#build-count').textContent(), '1 shipped');
    });
    await check('unfinished builds end without rewards and titles render as text', async () => {
      await page.locator('#build-title').fill('<img src=x onerror="window.hacked=true">');
      await page.getByRole('button', { name: /Start a little build/ }).click();
      assert.equal(await page.locator('#active-title img').count(), 0);
      await page.getByRole('button', { name: 'End without a celebration' }).click();
      assert.equal(await page.locator('#build-count').textContent(), '1 shipped');
      assert.equal(await page.evaluate(() => Boolean(window.hacked)), false);
    });
    await check('third build unlocks Orbit without an API or paid roll', async () => {
      for (let i = 0; i < 2; i++) {
        await page.getByRole('button', { name: /Try a 20-second build/ }).click();
        await page.getByRole('button', { name: 'I shipped it!', exact: false }).click();
      }
      await page.getByRole('button', { name: 'Choose Orbit', exact: true }).click();
      assert.equal(await page.locator('#build-count').textContent(), '3 shipped');
      assert.equal(await page.locator('.collection-card.locked').count(), 0);
    });
    await check('roaming link opens the movement playground without a browser overlay', async () => {
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: 'Try roaming mechanics' }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      await popup.clock.runFor(100);
      assert.match(popup.url(), /\/roam\//);
      await popup.waitForFunction(() => window.__buildlingsFrame);
      assert.equal(await popup.locator('#pet-canvas').count(), 1);
      assert.equal(await popup.evaluate(() => window.__buildlingsRenderer.type), 'canvas2d');
      await popup.close();
    });
    await check('share card downloads a real 1200×800 PNG', async () => {
      await page.getByRole('button', { name: 'Make a share card' }).click();
      await page.waitForFunction(() => !document.querySelector('#download-card').disabled);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download my card' }).click();
      const download = await downloadPromise;
      const file = path.join(output, 'share-card.png'); await download.saveAs(file);
      const bytes = await fs.readFile(file);
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      assert.equal(bytes.readUInt32BE(16), 1200);
      assert.equal(bytes.readUInt32BE(20), 800);
      assert.ok(bytes.length > 15000);
      await page.getByRole('button', { name: 'Close share card' }).click();
    });
    await check('progress backup downloads valid JSON; invalid restore preserves data', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save progress backup' }).click();
      const download = await downloadPromise;
      const file = path.join(output, 'progress.json'); await download.saveAs(file);
      const backup = JSON.parse(await fs.readFile(file, 'utf8'));
      assert.equal(backup.shipped, 3); assert.equal(backup.selected, 'orbit');
      await page.locator('#restore-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"shipped":-1}') });
      await page.waitForFunction(() => document.querySelector('#global-status').textContent.includes('not a valid'));
      assert.equal(await page.locator('#build-count').textContent(), '3 shipped');
    });
    await check('valid restore recovers selected companion on a new device', async () => {
      const restoreContext = await browser.newContext(); const restorePage = await restoreContext.newPage();
      await restorePage.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');
      await restorePage.locator('#restore-file').setInputFiles(path.join(output, 'progress.json'));
      await restorePage.waitForFunction(() => document.querySelector('#build-count').textContent === '3 shipped');
      assert.match(await restorePage.locator('#pet-name').textContent(), /Orbit/);
      await restoreContext.close();
    });
    await check('cosmetic import changes art, persists, and rejects invalid colours', async () => {
      const pack = { format: 'buildlings-colours-v1', name: 'Browser test pack', palettes: Object.fromEntries(['sprout', 'ember', 'orbit'].map(id => [id, { color: '#bbccdd', dark: '#8899aa', blush: '#eeaa99' }])) };
      await page.locator('#pack-file').setInputFiles({ name: 'test-pack.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
      await page.waitForFunction(() => document.querySelector('#pack-label').textContent === 'Browser test pack colours');
      assert.equal(await page.locator('#pet-art path[fill="#bbccdd"]').count() > 0, true);
      await page.reload();
      assert.equal(await page.locator('#pack-label').textContent(), 'Browser test pack colours');
      pack.palettes.orbit.color = '<script>';
      await page.locator('#pack-file').setInputFiles({ name: 'invalid-pack.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
      await page.waitForFunction(() => document.querySelector('#global-status').textContent.includes('not a valid'));
      assert.equal(await page.locator('#pack-label').textContent(), 'Browser test pack colours');
      await page.getByRole('button', { name: 'Use classic colours' }).click();
      assert.equal(await page.locator('#pack-label').textContent(), 'Classic companion colours');
    });
    await check('phone, tablet, and desktop layouts have no horizontal overflow', async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `overflow at ${width}`);
      }
      await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
    });
    await check('reduced-motion preference disables character animation', async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('#pet-art .pet-body').evaluate(e => getComputedStyle(e).animationName), 'none');
    });
    await check('storage failure is explicit and progress still works for the session', async () => {
      const privateContext = await browser.newContext(); const privatePage = await privateContext.newPage();
      await privatePage.addInitScript(() => Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); });
      await privatePage.goto(process.env.TEST_URL || 'http://127.0.0.1:3000');
      await privatePage.getByRole('button', { name: /Try a 20-second build/ }).click();
      await privatePage.getByRole('button', { name: 'I shipped it!', exact: false }).click();
      assert.equal(await privatePage.locator('#build-count').textContent(), '1 shipped');
      assert.match(await privatePage.locator('#global-status').textContent(), /cannot save progress/);
      await privateContext.close();
    });
    await check('normal play makes no external requests and raises no JS errors', async () => {
      assert.deepEqual(errors, []);
      const remote = requests.filter(url => !url.startsWith('http://127.0.0.1:3000') && !url.startsWith('blob:') && !url.startsWith('data:'));
      assert.deepEqual(remote, []);
    });
    console.log(`${results.length} browser checks passed. Artifacts: test-results/`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
