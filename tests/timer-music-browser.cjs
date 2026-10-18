const assert=require('node:assert/strict'),{chromium}=require('playwright'),{createServer}=require('../server.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?chromium.executablePath():'/usr/bin/chromium'),headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/roam/`);await page.waitForFunction(()=>window.__buildlingsFrame);
  await page.evaluate(()=>{window.__dragCalls=[];const old=window.companion.setDragging;window.companion.setDragging=value=>{window.__dragCalls.push(value);old(value);};});
  const first=await page.locator('#timer-bar').boundingBox(),grip=await page.locator('#bar-grip').boundingBox();
  await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();
  await page.mouse.move(grip.x+grip.width/2+150,grip.y+grip.height/2+160);
  await page.waitForTimeout(1200);
  const held=await page.locator('#timer-bar').boundingBox();assert.ok(Math.abs(held.x-first.x-150)<2);assert.ok(Math.abs(held.y-first.y-160)<2);
  await page.mouse.up();await page.waitForTimeout(1200);
  const saved=await page.evaluate(()=>window.__mischiefFocus.preferences.timerPosition);assert.ok(Number.isFinite(saved.displayId));assert.ok(saved.y>.1);
  const released=await page.locator('#timer-bar').boundingBox();assert.ok(Math.abs(released.y-held.y)<2);
  assert.deepEqual(await page.evaluate(()=>window.__dragCalls),[true,false]);
  await page.reload();await page.waitForFunction(()=>window.__buildlingsFrame);
  assert.ok(Math.abs((await page.locator('#timer-bar').boundingBox()).y-held.y)<2);
  console.log('PASS first drag survives clock updates, capture is released, and position survives restart');
  for(const locked of [true,false,true,false]){
   const b=await page.locator('#bar-lock').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
   const same=await page.evaluate(()=>{window.__lockSVG=document.querySelector('#bar-lock svg');return true;});assert.ok(same);
   await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.__lockSVG===document.querySelector('#bar-lock svg')),true);
   await page.mouse.up();await page.waitForFunction(v=>document.querySelector('#bar-lock').getAttribute('aria-pressed')===String(v),locked);
   assert.equal(await page.locator('#bar-grip').isDisabled(),locked);
  }
  console.log('PASS repeated lock/unlock clicks held across ticks preserve the pressed target');
  await page.locator('#bar-music').click();await page.waitForFunction(()=>window.__mischiefMusic.playing);
  await page.waitForTimeout(300);
  await page.locator('#bar-timer').click();assert.equal(await page.locator('#music-enabled').isChecked(),true);
  await page.locator('#music-volume').fill('23');await page.locator('#music-volume').dispatchEvent('input');
  assert.equal(await page.locator('#music-volume-value').textContent(),'23%');
  await page.locator('.close-desk').click();assert.equal(await page.evaluate(()=>window.__mischiefMusic.playing),true);
  await page.evaluate(()=>window.companion.focusAction({type:'preferences',values:{presence:'hidden',showHud:false}}));
  assert.equal(await page.evaluate(()=>window.__mischiefMusic.playing),true);
  await page.locator('#focus-open').click();await page.locator('#music-enabled').uncheck();await page.waitForFunction(()=>!window.__mischiefMusic.playing);
  await page.reload();await page.waitForFunction(()=>window.__buildlingsFrame);assert.equal(await page.evaluate(()=>window.__mischiefFocus.preferences.musicEnabled),false);
  assert.equal(await page.evaluate(()=>window.__mischiefFocus.preferences.musicVolume),23);
  console.log('PASS uploaded audio decodes, all music toggles agree, hidden controls do not stop it, volume and off state persist');
  // Inspect the real media element, including looping and suspend/resume races.
  await page.evaluate(async()=>{const {BackgroundMusic}=await import('/roam/assets/music.js');window.__musicTest=new BackgroundMusic();window.__musicTest.configure({musicEnabled:true,musicVolume:23});});
  await page.waitForFunction(()=>window.__musicTest.audio.currentTime>.05);
  assert.equal(await page.evaluate(()=>window.__musicTest.audio.volume),.23);
  assert.equal(await page.evaluate(()=>window.__musicTest.audio.loop),true);
  await page.evaluate(()=>{window.__musicTest.audio.currentTime=119.8;});
  await page.waitForFunction(()=>window.__musicTest.audio.currentTime<2);
  await page.evaluate(()=>window.__musicTest.suspend(true));assert.equal(await page.evaluate(()=>window.__musicTest.audio.paused),true);
  await page.evaluate(()=>window.__musicTest.suspend(false));await page.waitForFunction(()=>!window.__musicTest.audio.paused);
  await page.evaluate(()=>{for(let i=0;i<10;i++)window.__musicTest.configure({musicEnabled:i%2===0,musicVolume:23});});
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__musicTest.audio.paused),true);
  await page.evaluate(()=>window.__musicTest.configure({musicEnabled:true,musicVolume:0}));await page.waitForFunction(()=>!window.__musicTest.audio.paused);assert.equal(await page.evaluate(()=>window.__musicTest.audio.volume),0);
  assert.deepEqual(errors,[]);console.log('PASS real offline track loops, sleep pauses playback, rapid toggles settle off, zero volume works');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
