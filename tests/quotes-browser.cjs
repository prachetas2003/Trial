const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.clock.install();
    await page.addInitScript(() => {
      if (!localStorage.getItem('mischief-focus-preview-v1')) localStorage.setItem('mischief-focus-preview-v1', JSON.stringify({ version: 1, preferences: { quoteSeconds: 45 }, notes: [{ id: 'kept', text: 'My saved idea', done: false, createdAt: 1 }] }));
    });
    await page.goto('http://127.0.0.1:3000/roam/');
    await page.waitForFunction(() => window.__buildlingsFrame && window.__mischiefFocus);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.quoteSeconds), 12);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.notes[0].text), 'My saved idea');
    assert.deepEqual(await page.evaluate(() => [window.MischiefQuotes.everyday.length, window.MischiefQuotes.hard.length]), [120, 43]);
    // Spy on actual displayed quote payloads; leave the production scheduler running.
    await page.evaluate(() => { window.__quoteEvents = []; const send = window.companion.send.bind(window.companion); window.companion.send = input => { if (input.quote) window.__quoteEvents.push(input.quote); send(input); }; });
    await page.clock.fastForward(11000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 0);
    await page.clock.fastForward(1000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 1);
    await page.clock.fastForward(11000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 1);
    await page.clock.fastForward(1000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 2);
    const quotes = await page.evaluate(() => window.__quoteEvents);
    assert.ok(quotes[1].spokenAt - quotes[0].spokenAt >= 12000 && quotes[1].spokenAt - quotes[0].spokenAt < 13000); assert.notEqual(quotes[0].id, quotes[1].id);
    await page.clock.runFor(2000);
    assert.equal(await page.locator('.bubble-words').textContent(), quotes[1].text);
    assert.equal(await page.locator('#speech-bubble').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
    console.log('PASS updated 120/43 bank, preserved thoughts, full readable text, and 12-second cadence without the old 25-second minimum');
    await page.evaluate(() => window.companion.focusAction({ type: 'quote', category: 'hard' }));
    const manualAt = await page.evaluate(() => window.__quoteEvents.at(-1).spokenAt);
    await page.clock.fastForward(11000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 3);
    await page.clock.runFor(2000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 4);
    const gap = await page.evaluate(() => window.__quoteEvents.at(-1).spokenAt) - manualAt; assert.ok(gap >= 12000 && gap < 13000);
    await page.locator('#bar-timer').click(); await page.locator('[data-desk-tab=appearance]').click();
    assert.equal(await page.locator('#quote-seconds').inputValue(), '12');
    await page.locator('#quote-seconds').selectOption('25'); await page.locator('.close-desk').click();
    await page.clock.fastForward(24000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 4);
    await page.clock.runFor(2000); assert.equal(await page.evaluate(() => window.__quoteEvents.length), 5);
    await page.reload(); await page.waitForFunction(() => window.__mischiefFocus);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.quoteSeconds), 25);
    await page.evaluate(() => window.companion.focusAction({ type: 'preferences', values: { autoQuotes: false } }));
    const before = await page.evaluate(() => window.__mischiefFocus.lastQuotes.everyday);
    await page.clock.fastForward(60000); assert.equal(await page.evaluate(() => window.__mischiefFocus.lastQuotes.everyday), before);
    assert.deepEqual(errors, []);
    console.log('PASS manual encouragement gets 12 seconds, selectable cadence survives reload, and disabling automatic quotes is respected');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
