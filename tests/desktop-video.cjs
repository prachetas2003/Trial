// A real Chromium video window underneath the transparent Electron companion.
// Checks decoded frames AND desktop-composited pixels while native controls are used.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {_electron,chromium}=require('playwright');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {pages,click,hidePanel,pointer,point,action}=require('./native-helpers.cjs');
async function assertWindowOrder(app,at,role){
 if(process.platform!=='win32')return;
 const data=await app.evaluate(({app,screen},at)=>{const r=app.__buildlingsRuntime.getRuntime();return{handles:[r.win,r.timerWin||r.win,r.effectsWin||r.win].map(w=>{const b=w.getNativeWindowHandle();return String(b.length===8?b.readBigUInt64LE():b.readUInt32LE());}),point:screen.dipToScreenPoint({x:Math.round(at.x),y:Math.round(at.y)})};},at);
 const result=spawnSync('python',[path.join(root,'scripts/test-window-order.py'),...data.handles,String(data.point.x),String(data.point.y)],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 const order=JSON.parse(result.stdout);
 assert.match(order.foregroundTitle,/Mischief video fixture/,'The video browser must retain foreground focus');
 assert.ok(order.windows.every(w=>w.visible&&w.topmost&&w.aboveForeground),'Overlay was demoted behind the foreground browser: '+JSON.stringify(order));
 assert.equal(order.hit,data.handles[role==='pet'?0:1],'Native input hit the browser instead of the '+role);
 assert.ok(!data.handles.includes(order.foreground),'An overlay stole foreground focus');
}
// Select a video pixel by geometry, before examining its colour. A doodle's
// black ink is expected to occlude pixels underneath the doodle, not a video fault.
async function sampleDesktop(app){return app.evaluate(async({app,desktopCapturer,screen})=>{
 const runtime=app.__buildlingsRuntime.getRuntime(),d=screen.getPrimaryDisplay();
 const bounds=()=>[...(runtime.timerWin?[runtime.win,runtime.timerWin]:[]),runtime.focusWin].filter(w=>w&&!w.isDestroyed()&&w.isVisible()).map(w=>w.getBounds());
 const ink=()=>runtime.timerWin?[]:[runtime.hudRect,{x:(runtime.lastFrame?.x??0)-200,y:(runtime.lastFrame?.y??0)-300,width:400,height:400}].filter(Boolean);
 const original=bounds,boundsWithInk=()=>[...original(),...ink()];
 const before=boundsWithInk(),sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:d.size});
 const im=(sources.find(s=>s.display_id===String(d.id))||sources[0]).thumbnail,size=im.getSize(),bitmap=im.toBitmap(),excluded=[...before,...boundsWithInk()];
 let point;
 for(const y of [.25,.35,.45,.55,.65,.75,.8]){for(const x of [.95,.85,.75,.65,.55,.5,.45,.35,.25,.15,.05]){
   const p={x:d.bounds.x+d.size.width*x,y:d.bounds.y+d.size.height*y};
   if(excluded.every(b=>p.x<b.x-40||p.x>b.x+b.width+40||p.y<b.y-40||p.y>b.y+b.height+40)){point=p;break;}
 }if(point)break;}
 if(!point)throw new Error('No uncovered video pixel available: '+JSON.stringify(excluded));
 const x=Math.min(size.width-1,Math.floor((point.x-d.bounds.x)/d.size.width*size.width)),y=Math.min(size.height-1,Math.floor((point.y-d.bounds.y)/d.size.height*size.height)),i=(y*size.width+x)*4;
 return{r:bitmap[i+2],g:bitmap[i+1],b:bitmap[i],width:size.width,point,excluded,png:im.toPNG().toString('base64')};
});}
(async()=>{
 const clip=await fs.readFile(path.join(__dirname,'fixtures/focus-video.webm'));
 const server=http.createServer((req,res)=>{if(req.url==='/clip.webm'){res.writeHead(200,{'Content-Type':'video/webm'});res.end(clip);return;}
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Mischief video fixture</title><style>html,body{margin:0;background:#176b9b;width:100%;height:100%}video{width:100vw;height:100vh;object-fit:fill}button{position:fixed;top:40%;left:40%}</style><video id="video" src="/clip.webm" autoplay muted loop playsinline></video><button id="play">Play fullscreen</button><script>const v=document.querySelector("video");window.framesPresented=0;function frame(){window.framesPresented++;v.requestVideoFrameCallback(frame)}v.requestVideoFrameCallback(frame);document.querySelector("button").onclick=()=>{v.play();document.querySelector("button").remove()}</script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-video-'));let browser,app,video;
 async function openBrowser(){
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?chromium.executablePath():'/usr/bin/chromium'),headless:false,args:['--window-position=0,0','--autoplay-policy=no-user-gesture-required']});
  video=await browser.newPage({viewport:null});await video.goto(`http://127.0.0.1:${server.address().port}/`);await video.locator('#play').click();await video.waitForFunction(()=>window.framesPresented>10);
 }
 try{
  // Xvfb has no window manager to honour raising an older native surface.
  // Its decode/input baseline keeps the original launch order. Windows tests
  // open Chrome afterward and assert actual desktop z-order and native hits.
  if(process.platform!=='win32')await openBrowser();
  app=await _electron.launch({executablePath:require('electron'),args:['.',...(process.platform==='linux'?['--disable-setuid-sandbox','--use-angle=swiftshader']:[])],cwd:root,env:{...process.env,BUILDLINGS_TEST_DATA:temp},timeout:25000});
  const p=await pages(app),overlay=p.timer;
  await app.evaluate(async({app})=>{for(let i=0;i<200&&!app.__buildlingsRuntime.getRuntime().focusWin?.isVisible();i++)await new Promise(r=>setTimeout(r,25));const r=app.__buildlingsRuntime;r.getRuntime().focusWin.setBounds({x:10,y:100,width:450,height:650});r.applyFocus({type:'preferences',values:{autoQuotes:false,completionSound:false}});r.applyFocus({type:'start'});});
  // Open the browser AFTER the overlay, matching the reported desktop -> Chrome path.
  if(process.platform==='win32')await openBrowser();
  const display=await app.evaluate(({screen})=>screen.getPrimaryDisplay().workArea);const cdp=await video.context().newCDPSession(video),{windowId}=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId,bounds:{left:display.x,top:display.y,width:display.width,height:display.height,windowState:'normal'}});
  const panel=app.windows().find(p=>p.url().endsWith('/focus.html'));await panel.locator('#session-controls').waitFor({state:'visible'});
  const count=await video.evaluate(()=>window.framesPresented);
  for(let i=0;i<6;i++){
   console.log('Video interaction: pause/resume '+(i+1));
   await click(app,overlay,'#bar-pause');await overlay.waitForFunction(r=>document.querySelector('#bar-label').textContent===(r?'Paused':'Focus'),i%2===0,{timeout:5000});
   await panel.locator('[data-desk-tab=appearance]').click();await panel.locator('#timer-opacity').focus();await panel.locator('#timer-opacity').press(i%2?'ArrowRight':'ArrowLeft');
   await click(app,overlay,'#bar-tuck');
   const sample=await sampleDesktop(app);
   await fs.mkdir(path.join(root,'test-results'),{recursive:true});await fs.writeFile(path.join(root,'test-results/video-desktop.png'),Buffer.from(sample.png,'base64'));delete sample.png;await video.screenshot({path:path.join(root,'test-results/video-browser.png')});
   assert.ok(sample.width>0);if(process.platform==='win32')assert.ok(sample.b>40&&sample.g>60&&sample.r<80,`Video was obscured on the native desktop: ${JSON.stringify(sample)}`);
   const decoded=await video.locator('video').evaluate(v=>{const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(v,0,0,1,1);return [...c.getContext('2d').getImageData(0,0,1,1).data];});assert.ok(decoded[0]<80&&decoded[1]>60&&decoded[2]>40);
   assert.equal(await video.locator('video').evaluate(v=>v.paused),false);
  }
  await hidePanel(app);await action(app,{type:'pause'});await action(app,{type:'presence',value:'wander'});await p.pet.waitForFunction(()=>!window.__buildlingsEngine.returning);await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;if(!r.getRuntime().paused)r.togglePause();});
  if(process.platform==='win32')await video.bringToFront();
  for(const role of process.platform==='win32'?['pet','timer']:[]){
   const f=await p.pet.evaluate(()=>window.__buildlingsFrame),at=role==='timer'?await point(app,p.timer,'#bar-lock'):{x:f.x,y:f.y-65*f.scale},target=role==='timer'?p.timer:p.pet;
   await pointer(app,at,'move',target);await target.waitForTimeout(150);await assertWindowOrder(app,at,role);
   await pointer(app,at,'click',target);await target.waitForTimeout(150);await assertWindowOrder(app,at,role);
  }
  await action(app,{type:'preferences',values:{timerLocked:false}});
  console.log(process.platform==='win32'?'PASS real topmost styles, z-order and native input over a browser opened after the app; clicking overlays preserves browser focus':'UNRUN Windows z-order assertions: requires the Windows desktop');
  for(const kind of ['body','head','timer']){
    const f=await p.pet.evaluate(()=>window.__buildlingsFrame),at=kind==='timer'?await point(app,p.timer,'#bar-grip'):{x:f.x,y:f.y-(kind==='head'?155:65)*f.scale},target=kind==='timer'?p.timer:p.pet;
    await pointer(app,at,'move',target);await target.waitForTimeout(140);const start=await video.evaluate(()=>window.framesPresented);await pointer(app,at,'down',target);const colours=[];
    try{
      for(let j=0;j<5;j++){
        if(kind!=='body')await pointer(app,{x:at.x+j*8,y:at.y+j*5},'move',target);
        await target.waitForTimeout(170);
        let rgb;
        if(process.platform==='win32'){
          const sample=await sampleDesktop(app);await fs.writeFile(path.join(root,'test-results',`video-hold-${kind}-${j}.png`),Buffer.from(sample.png,'base64'));
          rgb=[sample.r,sample.g,sample.b];
        }else rgb=await video.locator('video').evaluate(v=>{const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(v,0,0,1,1);return [...c.getContext('2d').getImageData(0,0,1,1).data].slice(0,3);});
        assert.ok(rgb[0]<80&&rgb[1]>60&&rgb[2]>40,`Blank video while holding ${kind}: ${rgb}`);colours.push(rgb[2]);
      }
      assert.ok(Math.max(...colours)-Math.min(...colours)>30,`Video frames stopped changing while holding ${kind}`);assert.ok(await video.evaluate(()=>window.framesPresented)>start+10);
    }finally{await pointer(app,{x:at.x+32,y:at.y+20},'up',target);}
  }
  console.log('PASS video colours keep changing during stationary body holds, captured head drags and captured timer drags');
  assert.ok(await video.evaluate(()=>window.framesPresented)>count+20);
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});await video.screenshot({path:path.join(root,'test-results/video-under-overlay.png')});
  console.log('PASS a separate Chromium video keeps decoding coloured frames through native pause/resume, monkey tucking and panel slider changes');
  console.log(process.platform==='win32'?'PASS native Windows desktop pixels retain visible video throughout overlay interaction':'UNRUN native desktop pixel assertions: Xvfb has no compositing window manager; Windows CI runs these assertions');
  console.log('Video test uses a local VP8 clip. YouTube hardware decoding and physical GPU-driver faults require testing on the affected laptop.');
 }catch(error){
  if(app){const details=await app.evaluate(({app})=>{const r=app.__buildlingsRuntime.getRuntime();return{session:r.focus.snapshot().session,diagnostics:r.diagnostics,windows:[r.win,r.timerWin||r.win,r.effectsWin||r.win].map(w=>({bounds:w.getBounds(),visible:w.isVisible(),topmost:w.isAlwaysOnTop()}))};});console.error('Video failure state:',JSON.stringify(details));await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/video-failure-state.json',JSON.stringify(details,null,2));}
  throw error;
 }finally{if(app)await app.close();if(browser)await browser.close();await new Promise(r=>server.close(r));await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Video overlay::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
