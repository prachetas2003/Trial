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
    // The actual drawing surface must render before checking the artwork.
    await page.waitForFunction(() => window.__buildlingsEngine);
    await page.clock.runFor(100);
    assert.equal(await page.locator('#pet-canvas').count(), 1);
    const renderer = await page.evaluate(() => window.__buildlingsRenderer);
    assert.equal(renderer.type, 'canvas2d'); assert.equal(renderer.rigged, true);
    assert.equal(renderer.art, 'original-marker-monkey'); assert.ok(renderer.strokes > 30);
    assert.equal(await page.locator('#pet-canvas').getAttribute('aria-label'), 'Mischief, your marker-doodle monkey');
    const ink = await page.evaluate(async () => {
      const { MonkeyScene } = await import('/roam/assets/monkey.js?v=0.4.0');
      const host = document.createElement('div'), scene = new MonkeyScene(host);
      const f = { ...window.__buildlingsFrame, x: 160, y: 336, vx: 0, vy: 0, lean: 0, lookX: 0, lookY: 0,
        hop: 0, walkPhase: 0, walkWeight: 0, petWeight: 0, reach: 0, scaleX: 1, scaleY: 1, sparkleId: 0 };
      scene.draw(f, 500);
      const first = scene.ctx.getImageData(0, 0, scene.canvas.width, scene.canvas.height).data;
      scene.draw(f, 500);
      const second = scene.ctx.getImageData(0, 0, scene.canvas.width, scene.canvas.height).data;
      let solid = 0, clear = 0, orange = 0, changed = 0;
      for (let i = 0; i < first.length; i += 4) {
        if (first[i+3] > 240) solid++;
        if (!first[i+3]) clear++;
        if (first[i] > 170 && first[i+1] < 170 && first[i+3] > 240) orange++;
        for (let k = 0; k < 4; k++) if (first[i+k] !== second[i+k]) changed++;
      }
      return { solid, clear, orange, changed, faceAlpha: first[(219*320+160)*4+3], cornerAlpha: first[3] };
    });
    assert.ok(ink.solid > 3500); assert.ok(ink.clear > 80000); assert.ok(ink.orange > 900);
    assert.equal(ink.faceAlpha, 0); assert.equal(ink.cornerAlpha, 0); assert.equal(ink.changed, 0);
    console.log('PASS actual marker pixels, orange ink, open transparent face, and stable texture');
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
    await page.screenshot({ path: path.join(output, 'monkey-petting.png') });
    console.log('PASS cursor strokes blend into happy eyes, expressive pose, and drawn marker sparkles');

    assert.equal(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y - 94)?.closest('#companion-host'), fixed), false);
    assert.equal(await page.locator('#companion-host').evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('#companion-host').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
    console.log('PASS transparent canvas and character let page hit testing pass through');

    await page.evaluate(() => window.originalCanvas = document.querySelector('#pet-canvas'));
    await page.clock.runFor(1800);
    assert.equal(await page.evaluate(() => document.querySelector('#pet-canvas') === window.originalCanvas), true);
    assert.deepEqual(await page.evaluate(() => ({ x: window.__buildlingsFrame.x, y: window.__buildlingsFrame.y })), fixed);
    assert.equal(await page.locator('[data-pet]').count(), 0);
    console.log('PASS one monkey retains its drawing surface and paused location');

    await page.getByRole('button', { name: 'Dark screen', exact: true }).click(); await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => window.__buildlingsRenderer.ink), 'white');
    const whitePixels = await page.locator('#pet-canvas').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let white = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 200 && pixels[i+1] > 190 && pixels[i+2] > 175 && pixels[i+3] > 240) white++;
      return white;
    });
    assert.ok(whitePixels > 2500, 'white marker is actually rasterized, not just a setting');
    assert.equal(await page.evaluate(() => document.querySelector('#pet-canvas') === window.originalCanvas), true);
    await page.screenshot({ path: path.join(output, 'monkey-dark-screen.png') });
    await page.getByRole('button', { name: 'Light screen', exact: true }).click(); await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => window.__buildlingsRenderer.ink), 'black');
    console.log('PASS white-marker option remains legible on a dark screen without replacing the canvas');

    await page.getByRole('button', { name: 'Say hello', exact: true }).click(); await page.clock.runFor(1000);
    const hello = await page.evaluate(() => ({ frame: window.__buildlingsFrame, renderer: window.__buildlingsRenderer }));
    assert.equal(hello.frame.mode, 'reach'); assert.ok(hello.renderer.reachWeight > .95); assert.ok(hello.renderer.handScale > 1.6);
    await page.screenshot({ path: path.join(output, 'monkey-reach.png') });
    await page.mouse.move(fixed.x - 25, fixed.y - 94); await page.clock.runFor(16);
    await page.mouse.move(fixed.x + 25, fixed.y - 94); await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'pet');
    const interrupted = await page.evaluate(() => window.__buildlingsRenderer.reachWeight);
    assert.ok(interrupted > .15 && interrupted < .95, 'hand blends back instead of snapping on a petting interruption');
    await page.clock.runFor(1400); assert.equal(await page.evaluate(() => window.__buildlingsFrame.reach), 0);
    console.log('PASS reaching foreshortens and enlarges the hand and smoothly blends out when petted');

    await page.getByRole('button', { name: 'Try a jump', exact: true }).click(); await page.clock.runFor(80);
    assert.equal(await page.evaluate(() => window.__buildlingsFrame.jumpPhase), 'anticipation');
    assert.ok(await page.evaluate(() => window.__buildlingsFrame.scaleY) < 1);
    await page.clock.runFor(340); assert.ok(await page.evaluate(() => window.__buildlingsFrame.hop) > 35);
    await page.screenshot({ path: path.join(output, 'monkey-jump.png') });
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
    await page.screenshot({ path: path.join(output, 'roam-monkey.png'), fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(requests.filter(u => !u.startsWith('http://127.0.0.1:3000') && !u.startsWith('data:')), []);
    const retina = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await retina.goto(new URL('roam/', process.env.TEST_URL || 'http://127.0.0.1:3000/').href);
    await retina.waitForFunction(() => window.__buildlingsRenderer?.strokes > 30);
    assert.equal(await retina.locator('#pet-canvas').evaluate(c => c.width), 640);
    assert.equal(await retina.locator('#pet-canvas').evaluate(c => c.height), 740);
    assert.equal(await retina.locator('#pet-canvas').evaluate(c => c.getBoundingClientRect().width), 320);
    await retina.close();
    console.log('PASS high-DPI rendering retains the same pet size with twice the ink resolution');
    console.log('11 marker-monkey playground checks passed, with no external asset requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
