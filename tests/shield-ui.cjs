const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 950 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.clock.install(); await page.goto(new URL('roam/', process.env.TEST_URL || 'http://127.0.0.1:3000/').href);
    await page.waitForFunction(() => window.__mischiefFocus && window.__buildlingsFrame); await page.locator('#focus-open').click();
    await page.locator('[data-mode="blocker"]').click();
    assert.equal(await page.locator('[data-mode="blocker"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#companion-host').isVisible(), false); assert.equal(await page.locator('#timer-bar').isVisible(), false);
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('focus-vignette')), false);
    assert.equal(await page.locator('#shield-enabled').isChecked(), true);
    assert.match(await page.locator('#browser-status').textContent(), /Preview only/);
    await page.locator('#shield-rules > summary').click(); await page.locator('#website-input').fill('reddit.com'); await page.locator('#website-form').getByRole('button', { name: 'Add' }).click();
    assert.equal(await page.locator('#website-list').textContent(), 'reddit.comRemove');
    await page.locator('#website-input').fill('https://example.com/path'); await page.locator('#website-form').getByRole('button', { name: 'Add' }).click();
    assert.match(await page.locator('#desk-feedback').textContent(), /domains/); assert.equal(await page.locator('#website-list li').count(), 1);
    await page.locator('#block-shorts').uncheck(); assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.shield.features.shorts), false);
    await page.locator('[data-mode="deep"]').click();
    assert.equal(await page.locator('#companion-host').isVisible(), true); assert.equal(await page.locator('#timer-bar').isVisible(), true);
    await page.locator('#focus-minutes').fill('1'); await page.getByRole('button', { name: 'Start my focus session' }).click();
    await page.clock.runFor(1200); assert.equal(await page.locator('body').evaluate(e => e.classList.contains('focus-vignette')), true);
    assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e, '::after').pointerEvents), 'none');
    await page.locator('#stay-button').click(); assert.equal(await page.locator('#speech-bubble').isVisible(), false);
    await page.locator('#session-pause').click(); assert.equal(await page.locator('body').evaluate(e => e.classList.contains('focus-vignette')), false);
    await page.locator('#session-end').click();
    await page.locator('.preferences-card > summary').click(); await page.locator('#vignette').uncheck(); await page.locator('#presence').selectOption('wander');
    assert.equal(await page.locator('#mode-label').textContent(), 'Custom');
    await page.evaluate(() => window.companion.focusAction({ type: 'quote', category: 'hard' })); await page.clock.runFor(15000);
    assert.equal(await page.locator('#speech-bubble').isVisible(), false); assert.equal(await page.locator('#companion-host').isVisible(), true);
    await page.locator('#quotes-enabled').check(); await page.locator('#encourage').click(); await page.clock.runFor(1500);
    assert.equal(await page.locator('#speech-bubble').isVisible(), true); await page.locator('#quotes-enabled').uncheck(); assert.equal(await page.locator('#speech-bubble').isVisible(), false);
    await page.reload(); await page.locator('#focus-open').click(); await page.locator('.preferences-card > summary').click();
    assert.equal(await page.locator('#quotes-enabled').isChecked(), false); assert.equal(await page.locator('#presence').inputValue(), 'wander');
    assert.deepEqual(await page.evaluate(() => window.__mischiefFocus.preferences.shield.websites), ['reddit.com']);
    console.log('PASS presets, independent settings, silent monkey, hidden HUD, session-only glow, website validation and saved preferences');
    await page.locator('#shield-rules > summary').click(); await page.locator('#shield-tabs > summary').click();
    await page.screenshot({ path: 'test-results/focus-shield-panel.png', fullPage: true });
    for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 950 }); await page.clock.runFor(100); assert.equal(await page.locator('#focus-desk').evaluate(e => e.scrollWidth <= e.clientWidth), true); }
    assert.deepEqual(errors, []); console.log('PASS organized panel at 320px, 390px and 768px');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
