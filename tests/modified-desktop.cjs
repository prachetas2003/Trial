// Native input regression tests for the owner's single-overlay modified release.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron}=require('playwright');
const {until,pointer,point,click}=require('./native-helpers.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-modified-'));let app;
 const launch=async()=>{
  app=await _electron.launch({executablePath:process.env.BUILDLINGS_PACKAGE_EXE||require('electron'),args:process.env.BUILDLINGS_PACKAGE_EXE?[]:['.'],cwd:root,env:{...process.env,BUILDLINGS_TEST_DATA:temp},timeout:25000});
  await until(()=>app.evaluate(({app})=>!!app.__buildlingsRuntime?.getRuntime().focusWin?.isVisible()));
  const overlay=app.windows().find(p=>p.url().endsWith('/renderer.html')),panel=app.windows().find(p=>p.url().endsWith('/focus.html'));
  await overlay.waitForFunction(()=>window.__buildlingsFrame);await overlay.locator('#bar-grip').waitFor({state:'visible'});
  return{overlay,panel};
 };
 const action=a=>app.evaluate(({app},a)=>app.__buildlingsRuntime.applyFocus(a),a);
 const hide=()=>app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focusWin.hide());
 try{
  let {overlay,panel}=await launch();await hide();
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.isAlwaysOnTop()),true);
  const start=await overlay.locator('#timer-bar').boundingBox(),at=await point(app,overlay,'#bar-grip');
  await pointer(app,at,'move',overlay);await overlay.waitForTimeout(120);await pointer(app,at,'down',overlay);
  await until(()=>app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().dragging));
  await pointer(app,{x:at.x+90,y:at.y+130},'move',overlay);await overlay.waitForTimeout(1250);
  const held=await overlay.locator('#timer-bar').boundingBox();assert.ok(Math.abs(held.y-start.y-130)<3,JSON.stringify({start,held}));
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().interactive),true);
  await pointer(app,{x:at.x+90,y:at.y+130},'up',overlay);
  await until(()=>app.evaluate(({app})=>!app.__buildlingsRuntime.getRuntime().dragging));
  await until(()=>app.evaluate(({app})=>Number.isFinite(app.__buildlingsRuntime.getRuntime().focus.preferences.timerPosition?.displayId)));
  await overlay.waitForTimeout(1200);assert.ok(Math.abs((await overlay.locator('#timer-bar').boundingBox()).y-held.y)<3);
  console.log('PASS native first drag stays captured across hit bounds and clock ticks; valid display placement persists');
  for(const locked of [true,false,true,false]){
   const p=await point(app,overlay,'#bar-lock');await pointer(app,p,'move',overlay);await overlay.waitForTimeout(120);await pointer(app,p,'down',overlay);
   await overlay.evaluate(()=>window.__pressed=document.querySelector('#bar-lock svg'));await overlay.waitForTimeout(1100);
   assert.equal(await overlay.evaluate(()=>window.__pressed===document.querySelector('#bar-lock svg')),true);
   await pointer(app,p,'up',overlay);await until(()=>app.evaluate(({app},v)=>app.__buildlingsRuntime.getRuntime().focus.preferences.timerLocked===v,locked));
  }
  await click(app,overlay,'#bar-timer');assert.equal(await panel.locator('#start-form').isVisible(),true);
  await action({type:'start'});
  for(let i=0;i<4;i++){
   await hide();await click(app,overlay,'#bar-pause');await panel.waitForFunction(v=>document.querySelector('#session-pause').textContent===v,i%2===0?'Resume timer':'Pause timer');
   assert.equal(await overlay.locator('#bar-clock').textContent(),await panel.locator('#timer-clock').textContent());
   assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.presence()),i%2===0?'wander':'peek');
  }
  await action({type:'end'});await click(app,overlay,'#bar-music');await overlay.waitForFunction(()=>window.__mischiefMusic.playing);
  await click(app,overlay,'#bar-timer');await panel.locator('#music-enabled').waitFor({state:'attached'});assert.equal(await panel.locator('#music-enabled').isChecked(),true);
  await panel.locator('#music-volume').fill('22');await panel.locator('#music-volume').dispatchEvent('input');await until(()=>app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.preferences.musicVolume===22));
  await hide();assert.equal(await overlay.evaluate(()=>window.__mischiefMusic.playing),true);
  console.log('PASS native repeated unlock, panel/overlay timer synchronization, music controls and volume');
  await app.evaluate(({powerMonitor})=>powerMonitor.emit('suspend'));await overlay.waitForFunction(()=>!window.__mischiefMusic.playing);
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().suspended),true);
  await app.evaluate(({powerMonitor})=>powerMonitor.emit('resume'));
  await until(()=>app.windows().some(p=>p!==overlay&&p.url().endsWith('/renderer.html')));
  overlay=app.windows().find(p=>p.url().endsWith('/renderer.html')&&!p.isClosed());await overlay.waitForFunction(()=>window.__mischiefMusic?.playing&&window.__buildlingsFrame);
  await action({type:'preferences',values:{presence:'hidden',showHud:false}});assert.equal(await overlay.evaluate(()=>window.__mischiefMusic.playing),true);
  await action({type:'preferences',values:{showHud:true}});await click(app,overlay,'#bar-music');await overlay.waitForFunction(()=>!window.__mischiefMusic.playing);
  console.log('PASS simulated suspend pauses audio; replacement overlay resumes it once; hiding monkey/bar does not stop it');
  const position=await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.preferences.timerPosition);
  await app.close();app=null;({overlay,panel}=await launch());
  assert.deepEqual(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.preferences.timerPosition),position);
  assert.equal(await panel.locator('#music-enabled').isChecked(),false);assert.equal(await panel.locator('#music-volume').inputValue(),'22');
  assert.ok(Math.abs((await overlay.locator('#timer-bar').boundingBox()).y-held.y)<3);
  await action({type:'timer-reset'});await overlay.waitForFunction(()=>document.querySelector('#timer-bar').getBoundingClientRect().y<20);
  console.log('PASS saved drag, volume and off preference survive app restart; reset restores top timer');
 }finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Modified desktop regression::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
