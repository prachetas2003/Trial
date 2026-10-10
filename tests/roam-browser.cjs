const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  try {
    await page.addInitScript(() => Math.random = () => .5);
    await page.clock.install();
    await page.goto(new URL('roam/', process.env.TEST_URL || 'http://127.0.0.1:3000/').href);
    await page.clock.runFor(100);
    assert.equal(await page.locator('.volume-pet').count(), 1);
    const before = await page.evaluate(() => window.__buildlingsFrame.y);
    await page.clock.runFor(3000);
    assert.ok(Math.abs(await page.evaluate(() => window.__buildlingsFrame.y) - before) > 20);
    console.log('PASS shared desktop renderer roams autonomously in the browser');

    await page.getByRole('button', { name: 'Pause wandering', exact: true }).click();
    await page.clock.runFor(50);
    const fixed = await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y }));
    await page.mouse.move(fixed.x - 25, fixed.y - 80); await page.clock.runFor(50);
    for (let i = 0; i < 6; i++) { await page.mouse.move(fixed.x + (i % 2 ? 25 : -25), fixed.y - 80); await page.clock.runFor(80); }
    assert.ok(await page.locator('.sparkle').count() > 0);
    assert.equal(await page.locator('.happy-eyes').evaluate(e => getComputedStyle(e).opacity), '1');
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'pet');
    console.log('PASS strokes make visible sparkles and happy eyes without clicks');

    assert.equal(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y - 80)?.closest('#companion-host'), fixed), false);
    assert.equal(await page.locator('#companion-host').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('#companion-host').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
    console.log('PASS invisible pet surroundings and artwork allow page hit testing through them');

    await page.getByRole('button', { name: 'Ember', exact: true }).click(); await page.clock.runFor(50);
    assert.match(await page.locator('#pet').getAttribute('aria-label'), /Ember/);
    assert.equal(await page.getByRole('button', { name: 'Ember', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => window.originalVolumeNode = document.querySelector('.volume-pet'));
    await page.clock.runFor(1800);
    assert.equal(await page.evaluate(() => document.querySelector('.volume-pet') === window.originalVolumeNode), true);
    assert.deepEqual(await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y })), fixed);
    console.log('PASS pet selection and paused positions persist across animation frames');

    await page.getByRole('button', { name: 'Call your pet', exact: true }).click(); await page.clock.runFor(300);
    assert.ok(await page.evaluate(() => window.__buildlingsFrame.hop) > 20);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    await page.locator('#hopping').uncheck(); await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.hop), 0);
    await page.locator('#chasing').uncheck(); await page.clock.runFor(50);
    assert.notEqual(await page.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    console.log('PASS call triggers chasing and a jump; motion switches take effect');

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(60); await page.clock.runFor(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const f = await page.evaluate(() => window.__buildlingsFrame); assert.ok(f.x >= 0 && f.x <= width);
    }
    await fs.mkdir(path.resolve('test-results'), { recursive: true });
    await page.screenshot({ path: path.resolve('test-results/roam.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('6 movement-playground checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
