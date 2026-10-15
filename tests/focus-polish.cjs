// Media-query changes are Chromium rendering tasks; allow a real frame before advancing the virtual clock.
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {chromium}=require('playwright');const {createServer}=require('../server.cjs');
(async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?chromium.executablePath():'/usr/bin/chromium'),headless:true});
const page=await browser.newPage({viewport:{width:1300,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await fs.mkdir('test-results',{recursive:true});await page.clock.install();await page.goto(`http://127.0.0.1:${server.address().port}/roam/`);await page.waitForFunction(()=>window.__buildlingsFrame);
 await page.locator('#focus-open').click();await page.locator('[data-mode=companion]').click();await page.locator('#focus-minutes').fill('1');await page.getByRole('button',{name:'Start my focus session'}).click();
 await page.locator('[data-desk-tab=monkey]').click();await page.locator('#presence').focus();
 await page.evaluate(()=>document.querySelector('#bar-pause').click());assert.equal(await page.locator('#presence').inputValue(),'wander');
 await page.evaluate(()=>document.querySelector('#bar-pause').click());assert.equal(await page.locator('#presence').inputValue(),'peek');
 assert.equal(await page.locator('#presence').evaluate(e=>document.activeElement===e),true);await page.locator('[data-desk-tab=focus]').click();
 for(let i=0;i<10;i++){if(i%2===0)await page.evaluate(()=>document.querySelector('#bar-pause').click());else await page.locator('#session-pause').click();const running=i%2===1;assert.equal(await page.locator('#bar-label').textContent(),running?'Focus':'Paused');assert.equal(await page.locator('#session-pause').textContent(),running?'Pause timer':'Resume timer');assert.equal(await page.locator('#bar-clock').textContent(),await page.locator('#timer-clock').textContent());assert.equal(await page.evaluate(()=>window.__mischiefFocus.presence()),running?'peek':'wander');}
 console.log('PASS repeated mixed timer controls immediately agree on clock, pause state and focus presence');
 await page.locator('#session-end').click();await page.locator('[data-desk-tab=monkey]').click();
 await page.locator('#quotes-enabled').check();await page.evaluate(()=>window.companion.focusAction({type:'preferences',values:{autoQuotes:false}}));await page.locator('#encourage').click();await page.clock.runFor(1200);
 const original=await page.locator('#speech-bubble').boundingBox();await page.locator('#monkey-size').focus();await page.locator('#monkey-size').press('Home');await page.clock.runFor(100);
 const small=await page.locator('#speech-bubble').boundingBox();assert.ok(small.width<original.width*.65);assert.ok(await page.locator('#speech-bubble').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)*.6>=10.99));
 await page.locator('[data-desk-tab=appearance]').click();await page.locator('#screen-style').selectOption('dark');assert.equal(await page.locator('#speech-bubble').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(41, 39, 43)');
 await page.locator('#screen-style').selectOption('light');assert.equal(await page.locator('#speech-bubble').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 253, 244)');
 await page.locator('#screen-style').selectOption('auto');await page.emulateMedia({colorScheme:'dark'}); await page.waitForTimeout(100);await page.clock.runFor(100);assert.equal(await page.locator('#speech-bubble').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(41, 39, 43)');
 await page.screenshot({path:'test-results/scaled-dark-bubble.png'});console.log('PASS speech bubble scales with monkey, keeps readable text and follows manual/automatic dark theme');
 await page.locator('#vignette').check();await page.locator('#edge-coverage').focus();await page.locator('#edge-coverage').press('End');assert.equal(await page.locator('#edge-coverage-value').textContent(),'280 px');assert.equal(await page.locator('.focus-edge[data-side=left]').evaluate(e=>getComputedStyle(e).width),'280px');
 await page.locator('[data-desk-tab=blocking]').click();await page.locator('#shield-setup').evaluate(e=>e.open=true);
 const instructions=await page.locator('#shield-setup ol li').allTextContents();assert.equal(instructions.length,5);assert.match(instructions[0],/chrome:\/\/extensions/);assert.match(instructions[1],/Developer mode/);assert.match(instructions[2],/Load unpacked/);assert.match(instructions[3],/FocusShield/);assert.match(instructions[4],/pairing code/);
 assert.match(await page.locator('.mode-card .quiet-copy').textContent(),/Custom setup/);console.log('PASS wider adjustable focus coverage, clear section labels and ordered browser setup instructions');
 await page.locator('[data-desk-tab=focus]').click();await page.evaluate(()=>window.companion.focusAction({type:'preferences',values:{focusMinutes:1,presence:'peek',celebrations:true,returnAfterSession:true,completionSound:false,autoQuotes:false,chaseCursor:false}}));await page.getByRole('button',{name:'Start my focus session'}).click();
 for(const percent of [25,50,75]){await page.clock.fastForward(15100);await page.clock.runFor(100);assert.equal(await page.evaluate(()=>window.__mischiefCelebration.percent),percent);assert.equal(await page.locator('.celebration-piece[data-scope=monkey]').count(),10);assert.equal(await page.locator('.celebration-piece[data-scope=screen]').count(),0);assert.match(await page.locator('.celebration-badge').textContent(),new RegExp(percent+'% complete'));
 const bounds=await page.locator('.celebration-piece').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,z:+getComputedStyle(e).zIndex};}));assert.ok(bounds.every(r=>r.left>=0&&r.top>=0&&r.right<=1300&&r.bottom<=1000&&r.z>9990));assert.equal(await page.locator('.celebration-piece').first().evaluate(e=>getComputedStyle(e).pointerEvents),'none');}
 await page.clock.fastForward(15100);for(let i=0;i<45;i++){if(await page.evaluate(()=>window.__mischiefCelebration?.kind==='complete'))break;await page.clock.runFor(100);}
 assert.equal(await page.evaluate(()=>window.__mischiefCelebration.kind),'complete');assert.equal(await page.evaluate(()=>window.__mischiefCelebration.screen),34);assert.equal(await page.evaluate(()=>window.__mischiefFocus.presence()),'wander');
 assert.ok(await page.locator('.celebration-piece').count()<=48);await page.locator('.close-desk').click();await page.screenshot({path:'test-results/completion-confetti.png'});await page.clock.runFor(2600);assert.equal(await page.locator('.celebration-piece').count(),0);console.log('PASS visible, labelled local bursts at 25/50/75%, monkey returns at completion, bounded screen confetti and complete cleanup');
 await page.locator('#bar-timer').click();await page.locator('[data-desk-tab=appearance]').click();await page.locator('#celebrations').uncheck();await page.evaluate(()=>window.companion.focusAction({type:'start'}));await page.clock.fastForward(16000);await page.clock.runFor(100);assert.equal(await page.locator('.celebration-piece').count(),0);await page.evaluate(()=>window.companion.focusAction({type:'end'}));
 await page.locator('#celebrations').check();await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(100);await page.evaluate(()=>window.companion.focusAction({type:'start'}));await page.clock.fastForward(16000);await page.clock.runFor(100);assert.equal(await page.locator('.celebration-piece').count(),0);assert.equal(await page.locator('.celebration-badge').count(),1);

 await page.locator('.close-desk').click();
 await page.evaluate(async()=>{
   const {Celebrations}=await import('/roam/assets/celebrations.js');const c=new Celebrations();
   window.__edgeCelebrations=c;
   for(const [i,p]of [[-80,500],[innerWidth+80,500],[600,-80],[600,innerHeight+80]].entries())c.enqueue({id:'edge-'+i,kind:'milestone',percent:25},performance.now()),c.draw({x:p[0],y:p[1],scale:.6},performance.now(),true,false);
 });
 await page.clock.runFor(500);
 const edgePieces=await page.locator('.celebration-piece').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
 assert.equal(edgePieces.length,40);assert.ok(edgePieces.every(r=>r.left>=0&&r.top>=0&&r.right<=1300&&r.bottom<=1000));
 await page.screenshot({path:'test-results/visible-edge-milestones.png'});await page.clock.runFor(2500);assert.equal(await page.locator('.celebration-piece,.celebration-badge').count(),0);
 console.log('PASS milestones remain on-screen at all four margins with a 60% monkey and clean up');
 assert.deepEqual(errors,[]);console.log('PASS independent celebration switch, quiet preset compatibility and reduced-motion acknowledgement');
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Focus polish::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
