// Media-query changes are Chromium rendering tasks; allow a real frame before advancing the virtual clock.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../server.cjs');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (process.platform === 'win32' ? chromium.executablePath() : '/usr/bin/chromium'), headless: true });
  const server = process.env.TEST_URL ? null : createServer();
  if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const testURL = process.env.TEST_URL || `http://127.0.0.1:${server.address().port}/`;
  await fs.mkdir('test-results', {recursive:true});
  const page = await browser.newPage({ viewport: { width: 1200, height: 950 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.addInitScript(() => {
      const descriptor = { configurable:true, set(api) {
        Object.defineProperty(window,'companion',{configurable:true,writable:true,value:api});
        let register;
        Object.defineProperty(api,'onFocusState',{configurable:true,
          set(fn){register=fn;},
          get(){return callback=>{window.__renderPanelForTest=callback;return register(state=>callback(window.__manyTabs ? {...state,browser:{...state.browser,tabs:window.__manyTabs}} : state));};}
        });
      }};
      Object.defineProperty(window,'companion',descriptor);
    });
    await page.clock.install(); await page.goto(new URL('roam/', testURL).href);
    await page.waitForFunction(() => window.__mischiefFocus && window.__buildlingsFrame); await page.locator('#focus-open').click();
    await page.locator('[data-mode="blocker"]').click();
    assert.equal(await page.locator('[data-mode="blocker"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#companion-host').isVisible(), false); assert.equal(await page.locator('#timer-bar').isVisible(), false);
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('focus-vignette')), false);
    assert.equal(await page.locator('#shield-enabled').isChecked(), true);
    assert.match(await page.locator('#browser-status').textContent(), /Preview only/);
    await page.locator('#choose-blocking').click();
    await page.locator('#website-input').fill('reddit.com'); await page.locator('#website-form').getByRole('button', { name: 'Block website' }).click();
    assert.equal(await page.locator('#website-list').textContent(), 'reddit.comRemove');
    await page.locator('#website-input').fill('https://example.com/path'); await page.locator('#website-form').getByRole('button', { name: 'Block website' }).click();
    assert.match(await page.locator('#desk-feedback').textContent(), /domains/); assert.equal(await page.locator('#website-list li').count(), 1);
    await page.locator('#block-shorts').uncheck(); assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.shield.features.shorts), false);
    await page.locator('[data-desk-tab=focus]').click();
    await page.locator('[data-mode="deep"]').click();
    assert.equal(await page.locator('#companion-host').isVisible(), true); assert.equal(await page.locator('#timer-bar').isVisible(), true);
    await page.locator('#focus-minutes').fill('1'); await page.getByRole('button', { name: 'Start my focus session' }).click();
    await page.clock.runFor(1200); assert.equal(await page.locator('body').evaluate(e => e.classList.contains('focus-vignette')), true);
    assert.equal(await page.locator('.focus-edge').first().evaluate(e => getComputedStyle(e).pointerEvents), 'none');
    await page.locator('#stay-button').click(); assert.equal(await page.locator('#speech-bubble').isVisible(), false);
    await page.locator('#session-pause').click();
    assert.equal(await page.evaluate(() => window.__mischiefFocus.presence()), 'wander');
    await page.locator('#session-pause').click();
    assert.equal(await page.evaluate(() => window.__mischiefFocus.presence()), 'peek');
    await page.locator('#quotes-enabled').check();
    assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.autoQuotes), true);
    assert.equal(await page.evaluate(() => window.__mischiefFocus.preferences.quietFocus), false);
    await page.clock.runFor(2500); assert.equal(await page.locator('#speech-bubble').isVisible(), true);
    await page.locator('#quotes-enabled').uncheck();
    await page.clock.runFor(12000); assert.equal(await page.locator('#speech-bubble').isVisible(), false);
    await page.locator('#session-pause').click(); assert.equal(await page.locator('body').evaluate(e => e.classList.contains('focus-vignette')), false);
    await page.locator('#session-end').click();
    await page.locator('[data-desk-tab=appearance]').click(); await page.locator('#vignette').uncheck(); await page.locator('[data-desk-tab=monkey]').click(); await page.locator('#presence').selectOption('wander');
    assert.equal(await page.locator('#mode-label').textContent(), 'Custom');
    await page.evaluate(() => window.companion.focusAction({ type: 'quote', category: 'hard' })); await page.clock.runFor(15000);
    assert.equal(await page.locator('#speech-bubble').isVisible(), false); assert.equal(await page.locator('#companion-host').isVisible(), true);
    await page.locator('#quotes-enabled').check(); await page.locator('[data-desk-tab=monkey]').click(); await page.locator('#encourage').click(); await page.clock.runFor(1500);
    assert.equal(await page.locator('#speech-bubble').isVisible(), true); await page.locator('#quotes-enabled').uncheck(); assert.equal(await page.locator('#speech-bubble').isVisible(), false);
    await page.reload(); await page.locator('#focus-open').click(); await page.locator('[data-desk-tab=appearance]').click();
    assert.equal(await page.locator('#quotes-enabled').isChecked(), false); assert.equal(await page.locator('#presence').inputValue(), 'wander');
    assert.deepEqual(await page.evaluate(() => window.__mischiefFocus.preferences.shield.websites), ['reddit.com']);
    console.log('PASS presets, independent settings, silent monkey, hidden HUD, session-only glow, website validation and saved preferences');
    await page.locator('#show-hud').uncheck(); assert.equal(await page.locator('#timer-bar').isVisible(),false);
    await page.locator('#show-hud').check(); assert.equal(await page.locator('#timer-bar').isVisible(),true);
    await page.evaluate(()=>window.__buildlingsEngine.pause(true,performance.now())); await page.clock.runFor(1500);
    const anchor=await page.evaluate(()=>({x:window.__buildlingsFrame.x,y:window.__buildlingsFrame.y}));
    await page.locator('[data-desk-tab=monkey]').click(); await page.locator('#monkey-size').focus(); await page.locator('#monkey-size').press('Home'); await page.clock.runFor(100);
    const resized=await page.evaluate(()=>window.__buildlingsFrame);
    assert.equal(resized.scale,.6); assert.ok(Math.abs(resized.x-anchor.x)<1 && Math.abs(resized.y-anchor.y)<1);
    assert.ok(Math.abs((await page.locator('#companion-host').boundingBox()).width-192)<1);
    await page.locator('[data-desk-tab=appearance]').click(); await page.locator('#timer-opacity').focus(); await page.locator('#timer-opacity').press('Home');
    assert.equal(await page.locator('#timer-bar').evaluate(e=>e.style.getPropertyValue('--timer-alpha')),'0.15');
    assert.equal(await page.locator('#timer-bar').evaluate(e=>getComputedStyle(e).opacity),'1');
    await page.locator('#vignette').check(); await page.locator('#screen-style').selectOption('dark');
    await page.locator('#glow-intensity').focus(); await page.locator('#glow-intensity').press('End');
    assert.equal(await page.locator('body').evaluate(e=>e.style.getPropertyValue('--glow-rgb')),'0 0 0');
    assert.equal(await page.evaluate(()=>window.__mischiefFocus.preferences.glowIntensity),100);
    await page.locator('#screen-style').selectOption('auto');
    await page.emulateMedia({colorScheme:'dark'}); await page.waitForTimeout(100); await page.clock.runFor(100);
    assert.equal(await page.locator('body').evaluate(e=>e.style.getPropertyValue('--glow-rgb')),'0 0 0');
    await page.emulateMedia({colorScheme:'light'}); await page.waitForTimeout(100); await page.clock.runFor(100);
    assert.equal(await page.locator('body').evaluate(e=>e.style.getPropertyValue('--glow-rgb')),'40 40 40',JSON.stringify(await page.evaluate(()=>({p:window.__mischiefFocus.preferences.screenStyle,dark:matchMedia('(prefers-color-scheme: dark)').matches,ink:window.companion.focusInk}))));
    assert.equal(await page.locator('.focus-edge').first().evaluate(e=>getComputedStyle(e).animationName),'none');
    await page.locator('#screen-style').selectOption('dark');
    await page.locator('#quick-monkey').uncheck(); assert.equal(await page.locator('#companion-host').isVisible(),false);
    await page.locator('#quick-monkey').check(); assert.equal(await page.locator('#companion-host').isVisible(),true);
    await page.reload(); await page.locator('#focus-open').click(); await page.locator('[data-desk-tab=appearance]').click();
    assert.equal(await page.locator('#monkey-size').inputValue(),'60'); assert.equal(await page.locator('#timer-opacity').inputValue(),'15');
    assert.equal(await page.locator('#screen-style').inputValue(),'dark');
    await page.getByRole('button',{name:'Reset appearance',exact:true}).click();
    assert.equal(await page.locator('#monkey-size').inputValue(),'100'); assert.equal(await page.locator('#timer-opacity').inputValue(),'95');
    assert.equal(await page.locator('#screen-style').inputValue(),'auto');
    await page.locator('.close-desk').click(); await page.locator('#bar-settings').click();
    assert.equal(await page.locator('#appearance-view').isVisible(),true);
    await page.screenshot({path:'test-results/quick-appearance.png'});
    console.log('PASS direct visibility switches, anchored size slider, timer background transparency, neutral edges/theme/strength, persistence, reset and timer settings button');

    await page.evaluate(() => {
      window.__panelMutations = 0;
      window.__panelObserver = new MutationObserver(records => { window.__panelMutations += records.length; });
      window.__panelObserver.observe(document.querySelector('#appearance-view'), {subtree:true,childList:true,attributes:true,characterData:true});
    });
    await page.clock.runFor(5000);
    assert.equal(await page.evaluate(() => window.__panelMutations), 0);
    await page.evaluate(() => window.__panelObserver.disconnect());
    await page.locator('[data-desk-tab=blocking]').click();
    await page.evaluate(() => {
      const get = window.companion.getFocusState;
      window.__manyTabs = Array.from({length:200}, (_,i) => ({key:`test_browser:${i}`, title:`Work tab ${i}`, url:`https://work.test/${i}`, protection:{status:'available',reason:''}}));
      window.companion.getFocusState = async () => { const s=await get(); return {...s,browser:{...s.browser,tabs:window.__manyTabs}}; };
    });
    const many = await page.evaluate(() => window.companion.getFocusState());
    // Use the existing state subscription so the actual renderer, not a mock
    // list, builds all rows. The preview exposes listeners only through API.
    await page.evaluate(state => window.__renderPanelForTest(state), many);
    await page.locator('#browser-tabs li').first().scrollIntoViewIfNeeded();
    await page.mouse.move(650,650); await page.mouse.wheel(0,550); await page.clock.runFor(250);
    const scrolled = await page.locator('#focus-dialog').evaluate(e=>e.scrollTop);
    assert.ok(scrolled > 100);
    await page.evaluate(state => window.__renderPanelForTest(state), many);
    assert.equal(await page.locator('#focus-dialog').evaluate(e=>e.scrollTop), scrolled);
    assert.equal(await page.locator('#browser-tabs li').count(),200);
    console.log('PASS automatic quotes after silent preset, pause/resume presence, automatic neutral theme and stable 200-tab scrolling');
    await page.locator('[data-desk-tab=focus]').click();
    await page.screenshot({ path: 'test-results/focus-shield-panel.png', fullPage: true });
    for (const width of [320, 390, 768]) { await page.setViewportSize({ width, height: 950 }); await page.clock.runFor(100); assert.equal(await page.locator('#focus-desk').evaluate(e => e.scrollWidth <= e.clientWidth), true); }
    assert.deepEqual(errors, []); console.log('PASS organized panel at 320px, 390px and 768px');
  } finally { await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); if(process.env.GITHUB_ACTIONS) console.log('::error title=Focus controls regression::'+error.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A')); process.exitCode = 1; });
