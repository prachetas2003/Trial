const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron}=require('playwright');
const root=path.resolve(__dirname,'..');
async function eventually(check,timeout=15000){const end=Date.now()+timeout;do{if(await check())return;await new Promise(r=>setTimeout(r,100));}while(Date.now()<end);assert.fail('Native recovery did not finish before deadline');}
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-wake-'));let app;
 try{
  await fs.writeFile(path.join(temp,'focus-data.json'),JSON.stringify({version:2,preferences:{presence:'hidden',showHud:false,quotesEnabled:false,completionSound:false,celebrations:false},notes:[{id:'wake-note',text:'Keep my work',createdAt:Date.now()}]}));
  app=await _electron.launch({executablePath:require('electron'),args:['.',...(process.platform==='linux'?['--disable-setuid-sandbox','--use-angle=swiftshader']:[])],cwd:root,env:{...process.env,BUILDLINGS_TEST_DATA:temp},timeout:25000});
  await eventually(()=>app.evaluate(({app})=>!!app.__buildlingsRuntime?.getRuntime().focusWin?.isVisible()));
  let overlay=app.windows().find(p=>p.url().endsWith('/renderer.html')),panel=app.windows().find(p=>p.url().endsWith('/focus.html'));
  await panel.locator('#start-form').waitFor({state:'visible'});await overlay.waitForFunction(()=>window.__buildlingsFrame);
  assert.equal(await overlay.locator('#timer-bar').isVisible(),false);
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.preferences.presence),'hidden');
  await panel.locator('[data-desk-tab=appearance]').click();await panel.locator('#show-hud').check();await overlay.locator('#timer-bar').waitFor({state:'visible'});
  console.log('PASS launching with every overlay hidden still opens usable focus controls without changing the saved silent setup');
  if(process.platform==='win32'){
   assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().softwareGraphics),true);
   assert.doesNotMatch(await app.evaluate(({app})=>app.getGPUFeatureStatus().gpu_compositing),/^enabled/);
   console.log('PASS normal Windows startup uses software composition without requiring Safe Mode');
  }
  await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.applyFocus({type:'preferences',values:{presence:'peek',peekDuringFocus:true}});r.applyFocus({type:'start'});});
  await overlay.waitForTimeout(1100);
  for(let i=0;i<4;i++){
   if(i===1)await panel.locator('.close-desk').click();
   const old=await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.getRuntime().win.webContents.send('companion:input',{action:'jump'});return r.getRuntime().win.id;});
   const elapsed=await app.evaluate(({app,powerMonitor})=>{powerMonitor.emit('suspend');const r=app.__buildlingsRuntime.getRuntime();return r.focus.snapshot().session.elapsedMs;});
   assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.snapshot().session.running),false);
   assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().dragging),false);
   assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.isVisible()),false);
   await new Promise(r=>setTimeout(r,200));
   await app.evaluate(({powerMonitor})=>{powerMonitor.emit('resume');powerMonitor.emit('unlock-screen');});
   await eventually(()=>app.evaluate(({app},old)=>{const r=app.__buildlingsRuntime.getRuntime();return r.win.id!==old && r.win.isVisible() && r.diagnostics.filter(e=>e.type==='desktop-resumed').length>0;},old));
   await eventually(()=>app.evaluate(({app},n)=>app.__buildlingsRuntime.getRuntime().diagnostics.filter(e=>e.type==='desktop-resumed').length===n,i+1));
   overlay=app.windows().find(p=>p.url().endsWith('/renderer.html'));await overlay.waitForFunction(()=>window.__buildlingsFrame);
   const result=await app.evaluate(({app})=>{const r=app.__buildlingsRuntime.getRuntime();return{session:r.focus.snapshot().session,notes:r.focus.notes,panel:!!r.focusWin?.isVisible()};});
   assert.equal(result.session.running,false);assert.equal(result.session.elapsedMs,elapsed);assert.equal(result.notes[0].text,'Keep my work');assert.equal(result.panel,i===0);
   assert.equal(await overlay.locator('#bar-label').textContent(),'Paused');
   if(i===0){panel=app.windows().find(p=>p.url().endsWith('/focus.html'));await panel.locator('#session-pause').click();await overlay.waitForFunction(()=>document.querySelector('#bar-label').textContent==='Focus');await panel.locator('#session-pause').click();}
  }
  const wakes=await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().diagnostics.filter(e=>e.type==='overlay-reloaded'&&e.reason==='wake').length);assert.equal(wakes,4);
  console.log('PASS four simulated sleep/wake cycles rebuild surfaces once per wake, retain paused time and notes, and preserve panel visibility');
  const staleOverlay=await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.id);
  await overlay.evaluate(()=>{setTimeout(()=>{const until=Date.now()+20000;while(Date.now()<until){}},0);});
  await eventually(()=>app.evaluate(({app},id)=>{const r=app.__buildlingsRuntime.getRuntime();return r.win.id!==id&&r.win.isVisible();},staleOverlay));
  overlay=app.windows().find(p=>p.url().endsWith('/renderer.html'));await overlay.waitForFunction(()=>window.__buildlingsFrame);await overlay.locator('#bar-pause').click();await overlay.waitForFunction(()=>document.querySelector('#bar-label').textContent==='Focus');await overlay.locator('#bar-pause').click();
  console.log('PASS a renderer blocked by a real long task is replaced automatically and the new timer remains usable');
  await app.evaluate(({app})=>app.__buildlingsRuntime.showFocus());panel=app.windows().find(p=>p.url().endsWith('/focus.html'));await panel.locator('#session-controls').waitFor({state:'visible'});
  const panelId=await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focusWin.id);
  await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focusWin.webContents.forcefullyCrashRenderer());
  await eventually(()=>app.evaluate(({app},id)=>{const p=app.__buildlingsRuntime.getRuntime().focusWin;return !!p && p.id!==id && p.isVisible();},panelId));
  panel=app.windows().find(p=>p.url().endsWith('/focus.html'));await panel.locator('#session-controls').waitFor({state:'visible'});await panel.locator('#session-pause').click();await overlay.waitForFunction(()=>document.querySelector('#bar-label').textContent==='Focus');
  console.log('PASS an actually crashed controls renderer is replaced and its resume button still controls the overlay');
  console.log('Native startup/wake checks passed. Sleep events are simulated; physical laptop sleep and GPU-driver compatibility require device testing.');
 }finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Native wake::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
