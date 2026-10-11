const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.clock.install();
    await page.goto(new URL('roam/', process.env.TEST_URL || 'http://127.0.0.1:3000/').href);
    await page.waitForFunction(() => window.__buildlingsFrame);
    await page.clock.runFor(100);
    assert.equal(await page.locator('#timer-bar').isVisible(), true);
    assert.ok((await page.locator('#timer-bar').boundingBox()).y < 20);
    assert.equal(await page.locator('#bar-stay').isDisabled(), true);
    const firstQuote = await page.evaluate(() => window.__mischiefFocus.lastQuotes.everyday);
    await page.clock.fastForward(16000); await page.clock.runFor(100);
    assert.notEqual(await page.evaluate(() => window.__mischiefFocus.lastQuotes.everyday), firstQuote);
    const nextQuote = await page.evaluate(() => window.__mischiefFocus.lastQuotes.everyday);
    await page.clock.fastForward(55000); await page.clock.runFor(100);
    assert.notEqual(await page.evaluate(() => window.__mischiefFocus.lastQuotes.everyday), nextQuote);
    console.log('PASS top recording-style bar and frequent automatic quotes');

    await page.locator('#bar-timer').click();
    await page.locator('#focus-minutes').fill('1'); await page.locator('#intention').fill('Keep building my project');
    await page.getByRole('button', { name: 'Start my focus session' }).click();
    await page.locator('.close-desk').click(); await page.clock.runFor(2100);
    assert.equal(await page.locator('#bar-label').textContent(), 'Focus'); assert.match(await page.locator('#bar-clock').textContent(), /^00:5[89]$/);
    await page.locator('#bar-stay').click(); await page.clock.runFor(100);
    assert.equal(await page.locator('#bar-choices').textContent(), '1'); assert.equal(await page.locator('#bar-stay').isDisabled(), true);
    await page.clock.fastForward(2200); await page.locator('#bar-stay').click();
    assert.equal(await page.locator('#bar-choices').textContent(), '2');
    await page.locator('#bar-tuck').click(); await page.clock.runFor(100);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.presence()), 'wander');
    assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.peekDuringFocus), true);
    console.log('PASS timer opens focus corner, top choice button/cooldown, and temporary retrieval during focus');

    await page.evaluate(() => { const m = window.__buildlingsEngine; m.pause(true, performance.now()); m.pettedUntil = 0; }); await page.clock.runFor(3000);
    const pet = await page.evaluate(() => window.__buildlingsFrame);
    assert.equal(await page.evaluate(p => !!document.elementFromPoint(p.x, p.y - 94)?.closest('#pet-grab-zone'), pet), true);
    await page.mouse.move(pet.x, pet.y - 94); await page.mouse.down(); await page.clock.runFor(40);
    assert.equal(await page.evaluate(() => window.__buildlingsEngine.dragging), true);
    for (let i = 1; i <= 10; i++) { await page.mouse.move(pet.x - i * 18, pet.y - 94 - i * 5); await page.clock.runFor(25); }
    const dragged = await page.evaluate(() => ({ f: window.__buildlingsFrame, r: window.__buildlingsRenderer }));
    assert.ok(dragged.f.x < pet.x - 150); assert.ok(dragged.f.y < pet.y - 40); assert.ok(dragged.r.dragWeight > .8); assert.ok(Math.abs(dragged.r.legSwing) > .08);
    await page.screenshot({ path: path.resolve('test-results/monkey-drag.png') });
    await page.mouse.up(); await page.clock.runFor(2200);
    assert.equal(await page.evaluate(() => window.__buildlingsEngine.dragging), false); assert.ok(await page.evaluate(() => Math.abs(window.__buildlingsRenderer.legSwing)) < .04);
    console.log('PASS real pointer capture, click-and-drag, momentum in body/legs, and settling on release');

    await page.locator('#bar-tuck').click(); await page.clock.runFor(6000);
    const peek = await page.evaluate(() => window.__buildlingsFrame);
    await page.mouse.move(Math.min(1430, peek.x), peek.y - 94); await page.mouse.down(); await page.clock.runFor(30);
    assert.equal(await page.evaluate(() => window.__buildlingsEngine.dragging), true);
    await page.mouse.move(8, 550); await page.clock.runFor(250); await page.mouse.up(); await page.clock.runFor(100);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.edge), 'left');
    assert.equal(await page.evaluate(() => window.__buildlingsEngine.edge), 'left'); assert.ok(await page.evaluate(() => window.__buildlingsFrame.x) < 25);
    await page.locator('#bar-tuck').click(); await page.clock.runFor(3000);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.presence()), 'wander');
    console.log('PASS edge dragging switches margins, persists position, and brings monkey back');

    await page.locator('#bar-chase').click(); await page.mouse.move(1100, 500); await page.clock.runFor(1800);
    await page.clock.fastForward(7000); await page.clock.runFor(100);
    assert.equal(await page.locator('#bar-chase').getAttribute('aria-pressed'), 'true'); assert.equal(await page.evaluate(() => window.__buildlingsFrame.mode), 'chase');
    const chasingX = await page.evaluate(() => window.__buildlingsFrame.x);
    await page.mouse.move(200, 450); await page.clock.runFor(1500); assert.ok(await page.evaluate(() => window.__buildlingsFrame.x) < chasingX - 50);
    await page.locator('#bar-chase').click(); await page.clock.runFor(100);
    assert.equal(await page.locator('#bar-chase').getAttribute('aria-pressed'), 'false');
    await page.evaluate(() => window.companion.focusAction({ type: 'presence', value: 'hidden' })); await page.clock.runFor(100);
    assert.equal(await page.locator('#companion-host').isVisible(), false); assert.equal(await page.locator('#timer-bar').isVisible(), true);
    await page.locator('#bar-tuck').click(); await page.clock.runFor(100);
    assert.equal(await page.locator('#companion-host').isVisible(), true);
    console.log('PASS persistent chase past timeout, toggle off, and controls remain usable while monkey is hidden');

    await page.evaluate(() => window.__mischiefFocus.session.segmentStartedAt = Date.now() - 61000);
    await page.clock.fastForward(2000); await page.clock.runFor(100);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.history.length), 1);
    assert.equal(await page.locator('#timer-bar').evaluate(e => e.classList.contains('has-highlight')), true);
    await page.waitForFunction(() => window.__completionSound?.status === 'played');
    assert.equal(await page.evaluate(() => window.__completionSound.attempts), 1);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.presence()), 'wander');
    await page.screenshot({ path: path.resolve('test-results/monkey-timer-highlight.png') });
    await page.locator('#bar-timer').click(); assert.equal(await page.locator('#session-summary').isVisible(), true);
    assert.equal(await page.locator('#summary-choices').textContent(), '2'); assert.equal(await page.locator('#summary-intention').textContent(), 'Keep building my project');
    assert.equal(await page.locator('#timer-bar').evaluate(e => e.classList.contains('has-highlight')), false);
    await page.locator('.close-desk').click();
    console.log('PASS one completion sound, glowing clickable highlights, session summary and automatic return');
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 }); await page.clock.runFor(100);
      const r = await page.locator('#timer-bar').boundingBox(); assert.ok(r.x >= 0 && r.x + r.width <= width, `bar fits ${width}px`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS compact timer controls fit 320px, 390px and 768px without overflow');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
