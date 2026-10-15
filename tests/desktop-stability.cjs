const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const {_electron}=require('playwright');
const root=path.resolve(__dirname,'..');
async function click(app,page,selector){
  // Xvfb has no window manager: temporarily uncover the toolbar. Windows
  // retains both windows so its actual always-on-top routing is exercised.
  const uncover=process.platform==='linux' && await app.evaluate(({app})=>{const p=app.__buildlingsRuntime.getRuntime().focusWin;if(p?.isVisible()){p.hide();return true;}return false;});
  let point=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),a=window.__buildlingsEngine.area();return{x:a.x+r.x+r.width/2,y:a.y+r.y+r.height/2};});
  if(process.platform==='win32')point=await app.evaluate(({screen},p)=>screen.dipToScreenPoint(p),{x:Math.round(point.x),y:Math.round(point.y)});
  const native=(operation)=>{const r=spawnSync(process.platform==='win32'?'python':'python3',[path.join(root,'scripts/test-pointer.py'),String(Math.round(point.x)),String(Math.round(point.y)),operation],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);};
  native('move');
  if(process.platform==='linux')await app.evaluate(({app,screen},p)=>{app.__linuxTestCursor=p;screen.getCursorScreenPoint=()=>app.__linuxTestCursor;app.__buildlingsRuntime.getRuntime().win.setIgnoreMouseEvents(false);app.__buildlingsRuntime.getRuntime().win.moveTop();},point);
  await page.waitForTimeout(120);native('click');await page.waitForTimeout(180);
  if(uncover)await app.evaluate(({app})=>{const p=app.__buildlingsRuntime.getRuntime().focusWin;p?.show();p?.focus();});
}
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-stability-'));let app;
 const launch=safe=>_electron.launch({executablePath:require('electron'),args:['.',...(safe?['--safe-mode']:[]),...(process.platform==='linux'?['--disable-setuid-sandbox',...(safe?[]:['--use-angle=swiftshader'])]:[])],cwd:root,env:{...process.env,BUILDLINGS_TEST_DATA:temp},timeout:25000});
 try{
  const now=Date.now();
  await fs.writeFile(path.join(temp,'focus-data.json'),JSON.stringify({version:2,preferences:{presence:'peek',showHud:true,quotesEnabled:false,autoQuotes:false,vignette:true},notes:[{id:'saved-note',text:'Preserve this idea',createdAt:now,done:false}],session:{id:'saved-session',kind:'focus',planMs:1500000,elapsedMs:149000,startedAt:now-149000,choices:5,intention:'Continue my work'}}));
  app=await launch(false);const page=await app.firstWindow();await page.waitForFunction(()=>window.__buildlingsFrame);
  await app.evaluate(async({app})=>{for(let i=0;i<200&&!app.__buildlingsRuntime.getRuntime().focusWin?.isVisible();i++)await new Promise(r=>setTimeout(r,25));const p=app.__buildlingsRuntime.getRuntime().focusWin;if(!p?.isVisible())throw new Error('Startup controls did not appear');p.hide();});
  assert.equal(await page.locator('#bar-label').textContent(),'Paused');assert.equal(await page.locator('#bar-clock').textContent(),'22:31');
  await app.evaluate(({app})=>app.__buildlingsRuntime.applyFocus({type:'preferences',values:{showHud:false}}));
  await page.locator('#timer-bar').waitFor({state:'hidden'});
  assert.equal(await page.locator('#timer-bar').isVisible(),false);
  await app.evaluate(({app})=>app.__buildlingsRuntime.applyFocus({type:'preferences',values:{showHud:true}}));
  await page.locator('#timer-bar').waitFor({state:'visible'});
  assert.equal(await page.locator('#bar-stay').isEnabled(),true);assert.match(await page.locator('#bar-stay').textContent(),/Resume & stay/);
  await click(app,page,'#bar-stay');
  await page.waitForFunction(()=>document.querySelector('#bar-choices').textContent==='6'&&document.querySelector('#bar-label').textContent==='Focus');
  await click(app,page,'#bar-pause');await page.waitForFunction(()=>document.querySelector('#bar-label').textContent==='Paused');
  const controlsPromise=Promise.resolve(app.windows().find(p=>p.url().endsWith('/focus.html')));await click(app,page,'#bar-settings');const controls=await controlsPromise;await controls.locator('#appearance-view').waitFor({state:'visible'});
  assert.equal(await app.evaluate(({globalShortcut})=>globalShortcut.isRegistered('CommandOrControl+Alt+F')),true);
  await app.evaluate(({app})=>Promise.all([app.__buildlingsRuntime.showFocus(),app.__buildlingsRuntime.showFocus('appearance')]));
  await controls.locator('#appearance-view').waitFor({state:'visible'});
  assert.equal(await controls.locator('#appearance-view').isVisible(),true);
  await controls.locator('[data-desk-tab=focus]').click();
  for(let i=0;i<12;i++) {
    if(i%2===0)await click(app,page,'#bar-pause');else await controls.locator('#session-pause').click();
    const running=i%2===0;
    await page.waitForFunction(r=>document.querySelector('#bar-label').textContent===(r?'Focus':'Paused'),running);
    await controls.waitForFunction(r=>document.querySelector('#session-pause').textContent===(r?'Pause timer':'Resume timer'),running);
    assert.equal(await page.locator('#bar-clock').textContent(),await controls.locator('#timer-clock').textContent());
    assert.equal(await page.evaluate(()=>window.__buildlingsEngine.presence),running?'peek':'wander');
  }
  await click(app,page,'#bar-pause');
  await page.waitForFunction(()=>{const m=window.__buildlingsEngine,t=m.peekTarget();return m.presence==='peek'&&Math.hypot(m.x-t.x,m.y-t.y)<4;},null,{timeout:12000});
  await click(app,page,'#bar-pause');
  console.log('PASS twelve alternating toolbar/panel pause cycles keep clocks synchronized and the monkey physically returns to its edge');
  await controls.locator('[data-desk-tab=appearance]').click();
  console.log('PASS recovered paused session, real toolbar clicks, Resume & stay, direct pause/resume and concurrently opened controls');
  const saves=await app.evaluate(async({app})=>{
   const r=app.__buildlingsRuntime;await r.getRuntime().storage.flush();const before=r.getRuntime().storage.stats().writes;
   for(let i=0;i<150;i++)r.applyFocus({type:'preferences',values:{timerOpacity:15+i%86}});
   await r.getRuntime().storage.flush();return{writes:r.getRuntime().storage.stats().writes-before,opacity:r.getRuntime().focus.preferences.timerOpacity};
  });assert.equal(saves.writes,1);assert.equal(saves.opacity,78);
  const saved=JSON.parse(await fs.readFile(path.join(temp,'focus-data.json')));assert.equal(saved.notes[0].text,'Preserve this idea');assert.equal(saved.session.choices,6);
  console.log('PASS 150 settings changes coalesce into one atomic save and preserve saved work');
  await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.applyFocus({type:'presence',value:'hidden'});r.applyFocus({type:'resume'});});
  await page.waitForTimeout(500);
  const clear=await app.evaluate(async({app})=>{const image=await app.__buildlingsRuntime.getRuntime().win.webContents.capturePage();const size=image.getSize(),b=image.toBitmap();const x=Math.floor(size.width/2),y=Math.floor(size.height/2);return{alpha:b[(y*size.width+x)*4+3]};});assert.equal(clear.alpha,0);
  assert.equal(await page.locator('.focus-edge').count(),4);
  await controls.locator('.close-desk').click();await click(app,page,'#bar-pause');await page.waitForFunction(()=>document.querySelector('#bar-label').textContent==='Paused');
  console.log('PASS active focus edges leave the native screen centre transparent and toolbar stays responsive');
  await app.evaluate(({app})=>app.__buildlingsRuntime.applyFocus({type:'presence',value:'wander'}));
  await page.evaluate(()=>{const original=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){CanvasRenderingContext2D.prototype.clearRect=original;throw new Error('Intentional paint failure');};});
  await page.waitForFunction(()=>!document.querySelector('#bar-message').hidden);
  assert.match(await page.locator('#bar-message').textContent(),/drawing failed/);
  await click(app,page,'#bar-settings');await controls.locator('#appearance-view').waitFor({state:'visible'});
  await controls.locator('.close-desk').click();
  console.log('PASS intentional paint failure leaves native timer controls usable and shows recovery feedback');
  const recoveryPromise=app.waitForEvent('window');
  await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.webContents.forcefullyCrashRenderer());
  for(let i=0;i<100;i++){if(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().diagnostics.some(e=>e.type==='overlay-reloaded')))break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().diagnostics.some(e=>e.type==='overlay-reloaded')),true);
  const recovered=await recoveryPromise; await recovered.waitForFunction(()=>window.__buildlingsFrame);await click(app,recovered,'#bar-settings');await controls.locator('#appearance-view').waitFor({state:'visible'});
  await app.close();app=null;
  console.log('PASS actual renderer crash reloads the overlay, releases input and preserves access to controls');
  app=await launch(true);const safe=await app.firstWindow();await safe.waitForFunction(()=>window.__buildlingsFrame);
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().safeMode),true);
  assert.doesNotMatch(await app.evaluate(({app})=>app.getGPUFeatureStatus().gpu_compositing),/^enabled/);
  assert.equal(await safe.evaluate(()=>window.__buildlingsRenderer.pixelRatio),1);
  await app.evaluate(async({app})=>{for(let i=0;i<200&&!app.__buildlingsRuntime.getRuntime().focusWin?.isVisible();i++)await new Promise(r=>setTimeout(r,25));const p=app.__buildlingsRuntime.getRuntime().focusWin;if(!p?.isVisible())throw new Error('Startup controls did not appear');p.hide();});
  const safeControlsPromise=Promise.resolve(app.windows().find(p=>p.url().endsWith('/focus.html')));await click(app,safe,'#bar-settings');const safeControls=await safeControlsPromise;await safeControls.locator('#appearance-view').waitFor({state:'visible'});
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.notes[0].text),'Preserve this idea');
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.session.choices),6);
  console.log('PASS Safe Mode starts without hardware acceleration and preserves session, notes and real toolbar controls');
  console.log('7 native stability checks passed. Windows evidence requires a Windows run.');
 }finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);if(process.env.GITHUB_ACTIONS)console.log('::error title=Native stability::'+error.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
