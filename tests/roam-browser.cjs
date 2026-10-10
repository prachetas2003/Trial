const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], requests = []; page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => errors.push(r.url())); page.on('request', r => requests.push(r.url()));
  const output = path.resolve('test-results'); await fs.mkdir(output, { recursive: true });
  try {
    await page.addInitScript(() => Math.random = () => .5);
    await page.clock.install();
    await page.goto(new URL('roam/', process.env.TEST_URL || 'http://127.0.0.1:3000/').href);
    // Module imports and GPU initialization use actual browser scheduling.
    await page.waitForFunction(() => window.__buildlingsEngine);
    await page.clock.runFor(100);
    assert.equal(await page.locator('#pet-canvas').count(), 1);
    const renderer = await page.evaluate(() => window.__buildlingsRenderer);
    assert.equal(renderer.type, 'webgl2'); assert.equal(renderer.rigged, true); assert.ok(renderer.triangles > 5000);
    assert.equal(renderer.flexibleEars, true); assert.equal(renderer.cameraPerspective, true);
    assert.equal(await page.locator('#pet-canvas').getAttribute('aria-label'), 'Sprout, your 3D desktop companion');
    console.log('PASS original 3D Sprout renders real geometry with a rig and flexible ears');
    const before = await page.evaluate(() => window.__buildlingsFrame.y);
    await page.clock.runFor(3300);
    assert.ok(Math.abs(await page.evaluate(() => window.__buildlingsFrame.y) - before) > 20);
    const transform = await page.locator('#companion-host').getAttribute('style'); assert.match(transform, /translate3d/);
    console.log('PASS display-driven renderer roams with fractional compositor transforms');

    await page.getByRole('button', { name: 'Pause wandering', exact: true }).click(); await page.clock.runFor(50);
    const fixed = await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y }));
    await page.mouse.move(fixed.x - 25, fixed.y - 94); await page.clock.runFor(50);
    for (let i = 0; i < 8; i++) { await page.mouse.move(fixed.x + (i % 2 ? 25 : -25), fixed.y - 94); await page.clock.runFor(90); }
    const happy = await page.evaluate(() => ({ ...window.__buildlingsRenderer, mode: window.__buildlingsFrame.mode }));
    assert.ok(happy.particles > 0); assert.ok(happy.petWeight > .8); assert.equal(happy.mode, 'pet');
    await page.screenshot({ path: path.join(output, '3d-petting.png') });
    console.log('PASS cursor strokes blend into happy eyes, soft compression, and 3D sparkles');

    assert.equal(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y - 94)?.closest('#companion-host'), fixed), false);
    assert.equal(await page.locator('#companion-host').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('#companion-host').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
    console.log('PASS transparent canvas and character let page hit testing pass through');

    await page.getByRole('button', { name: 'Ember', exact: true }).click(); await page.clock.runFor(50);
    assert.match(await page.locator('#pet-canvas').getAttribute('aria-label'), /Ember/);
    await page.evaluate(() => window.originalCanvas = document.querySelector('#pet-canvas'));
    await page.clock.runFor(1800);
    assert.equal(await page.evaluate(() => document.querySelector('#pet-canvas') === window.originalCanvas), true);
    assert.deepEqual(await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y })), fixed);
    await page.getByRole('button', { name: 'Sprout', exact: true }).click(); await page.clock.runFor(100);
    console.log('PASS pet selection keeps the GPU canvas and paused location intact');

    await page.getByRole('button', { name: 'Say hello', exact: true }).click(); await page.clock.runFor(1000);
    const hello = await page.evaluate(() => ({ frame: window.__buildlingsFrame, renderer: window.__buildlingsRenderer }));
    assert.equal(hello.frame.mode, 'reach'); assert.ok(hello.renderer.reachWeight > .95); assert.ok(hello.renderer.pawReach < -1);
    await page.screenshot({ path: path.join(output, '3d-reach.png') });
    await page.mouse.move(fixed.x - 25, fixed.y - 94); await page.clock.runFor(16);
    await page.mouse.move(fixed.x + 25, fixed.y - 94); await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'pet');
    const interrupted = await page.evaluate(() => window.__buildlingsRenderer.reachWeight);
    assert.ok(interrupted > .15 && interrupted < .95, 'paw blends back instead of snapping on a petting interruption');
    await page.clock.runFor(1400); assert.equal(await page.evaluate(() => window.__buildlingsFrame.reach), 0);
    console.log('PASS reaching moves toward the camera and smoothly blends out when petted');

    await page.getByRole('button', { name: 'Try a jump', exact: true }).click(); await page.clock.runFor(80);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.jumpPhase), 'anticipation');
    assert.ok(await page.evaluate(() => window.__buildlingsFrame.scaleY) < 1);
    await page.clock.runFor(340); assert.ok(await page.evaluate(() => window.__buildlingsFrame.hop) > 35);
    await page.screenshot({ path: path.join(output, '3d-jump.png') });
    await page.clock.runFor(420); assert.equal(await page.evaluate(() => window.__buildlingsFrame.jumpPhase), 'landing');
    await page.clock.runFor(400); assert.equal(await page.evaluate(() => window.__buildlingsFrame.hop), 0);
    console.log('PASS jump has anticipation, an airborne arc, landing compression, and recovery');

    await page.getByRole('button', { name: 'Call your pet', exact: true }).click(); await page.clock.runFor(450);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    assert.ok(await page.evaluate(() => window.__buildlingsFrame.moving));
    await page.locator('#hopping').uncheck(); await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.hop), 0);
    await page.locator('#chasing').uncheck(); await page.clock.runFor(50);
    assert.notEqual(await page.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    console.log('PASS cursor chasing and motion switches operate in the shared simulation');

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(60); await page.clock.runFor(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const f = await page.evaluate(() => window.__buildlingsFrame); assert.ok(f.x >= 0 && f.x <= width);
    }
    assert.equal(await page.locator('#pet-canvas').evaluate(c => c.width), 320);
    await page.getByRole('button', { name: 'Pause wandering', exact: true }).click(); await page.clock.runFor(100);
    await page.screenshot({ path: path.join(output, 'roam-3d.png'), fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(requests.filter(u => !u.startsWith('http://127.0.0.1:3000') && !u.startsWith('data:')), []);
    console.log('9 3D movement-playground checks passed, with no external asset requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
