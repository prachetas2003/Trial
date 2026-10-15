// A real Chromium video window underneath the transparent Electron companion.
// Checks decoded frames AND desktop-composited pixels while native controls are used.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {spawnSync}=require('node:child_process');
const {_electron,chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function click(app,page,selector){
 let point=await page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),a=window.__buildlingsEngine.area();return{x:a.x+r.x+r.width/2,y:a.y+r.y+r.height/2};});
 if(process.platform==='win32')point=await app.evaluate(({screen},p)=>screen.dipToScreenPoint(p),{x:Math.round(point.x),y:Math.round(point.y)});
 const native=op=>{const r=spawnSync(process.platform==='win32'?'python':'python3',[path.join(root,'scripts/test-pointer.py'),String(Math.round(point.x)),String(Math.round(point.y)),op],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
 native('move');if(process.platform==='linux')await app.evaluate(({app,screen},p)=>{app.__testCursor=p;screen.getCursorScreenPoint=()=>app.__testCursor;const w=app.__buildlingsRuntime.getRuntime().win;w.setIgnoreMouseEvents(false);w.moveTop();},point);
 await page.waitForTimeout(120);native('click');await page.waitForTimeout(180);
}
(async()=>{
 const clip=await fs.readFile(path.join(__dirname,'fixtures/focus-video.webm'));
 const server=http.createServer((req,res)=>{if(req.url==='/clip.webm'){res.writeHead(200,{'Content-Type':'video/webm'});res.end(clip);return;}
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><style>html,body{margin:0;background:#176b9b;width:100%;height:100%}video{width:100vw;height:100vh;object-fit:fill}button{position:fixed;top:40%;left:40%}</style><video id="video" src="/clip.webm" autoplay muted loop playsinline></video><button id="play">Play fullscreen</button><script>const v=document.querySelector("video");window.framesPresented=0;function frame(){window.framesPresented++;v.requestVideoFrameCallback(frame)}v.requestVideoFrameCallback(frame);document.querySelector("button").onclick=()=>{v.play();document.querySelector("button").remove()}</script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-video-'));let browser,app;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?chromium.executablePath():'/usr/bin/chromium'),headless:false,args:['--window-position=0,0','--autoplay-policy=no-user-gesture-required']});
  const video=await browser.newPage({viewport:null});await video.goto(`http://127.0.0.1:${server.address().port}/`);await video.locator('#play').click();await video.waitForFunction(()=>window.framesPresented>10);
  app=await _electron.launch({executablePath:require('electron'),args:['.',...(process.platform==='linux'?['--disable-setuid-sandbox','--use-angle=swiftshader']:[])],cwd:root,env:{...process.env,BUILDLINGS_TEST_DATA:temp},timeout:25000});
  const overlay=await app.firstWindow();await overlay.waitForFunction(()=>window.__buildlingsFrame);
  await app.evaluate(async({app})=>{for(let i=0;i<200&&!app.__buildlingsRuntime.getRuntime().focusWin?.isVisible();i++)await new Promise(r=>setTimeout(r,25));const r=app.__buildlingsRuntime;r.getRuntime().focusWin.setBounds({x:10,y:100,width:450,height:650});r.applyFocus({type:'preferences',values:{autoQuotes:false,completionSound:false}});r.applyFocus({type:'start'});});
  const display=await app.evaluate(({screen})=>screen.getPrimaryDisplay().workArea);const cdp=await video.context().newCDPSession(video),{windowId}=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId,bounds:{left:display.x,top:display.y,width:display.width,height:display.height,windowState:'normal'}});
  const panel=app.windows().find(p=>p.url().endsWith('/focus.html'));await panel.locator('#session-controls').waitFor({state:'visible'});
  const count=await video.evaluate(()=>window.framesPresented);
  for(let i=0;i<6;i++){
   await click(app,overlay,'#bar-pause');await overlay.waitForFunction(r=>document.querySelector('#bar-label').textContent===(r?'Paused':'Focus'),i%2===0);
   await panel.locator('[data-desk-tab=appearance]').click();await panel.locator('#timer-opacity').focus();await panel.locator('#timer-opacity').press(i%2?'ArrowRight':'ArrowLeft');
   await click(app,overlay,'#bar-tuck');
   const sample=await app.evaluate(async({desktopCapturer,screen})=>{const d=screen.getPrimaryDisplay(),sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:d.size.width,height:d.size.height}}),s=sources.find(s=>s.display_id===String(d.id))||sources[0],im=s.thumbnail,b=im.toBitmap(),size=im.getSize(),idx=(Math.floor(size.height*.65)*size.width+Math.floor(size.width*.75))*4;return{b:b[idx],g:b[idx+1],r:b[idx+2],width:size.width,png:im.toPNG().toString('base64')};});
   await fs.mkdir(path.join(root,'test-results'),{recursive:true});await fs.writeFile(path.join(root,'test-results/video-desktop.png'),Buffer.from(sample.png,'base64'));delete sample.png;await video.screenshot({path:path.join(root,'test-results/video-browser.png')});
   assert.ok(sample.width>0);if(process.platform==='win32')assert.ok(sample.b>100&&sample.g>60&&sample.r<70,`Video was obscured on the native desktop: ${JSON.stringify(sample)}`);
   const decoded=await video.locator('video').evaluate(v=>{const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(v,0,0,1,1);return [...c.getContext('2d').getImageData(0,0,1,1).data];});assert.ok(decoded[0]<70&&decoded[1]>60&&decoded[2]>100);
   assert.equal(await video.locator('video').evaluate(v=>v.paused),false);
  }
  assert.ok(await video.evaluate(()=>window.framesPresented)>count+20);
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});await video.screenshot({path:path.join(root,'test-results/video-under-overlay.png')});
  console.log('PASS a separate Chromium video keeps decoding coloured frames through native pause/resume, monkey tucking and panel slider changes');
  console.log(process.platform==='win32'?'PASS native Windows desktop pixels retain visible video throughout overlay interaction':'UNRUN native desktop pixel assertions: Xvfb has no compositing window manager; Windows CI runs these assertions');
  console.log('Video test uses a local VP8 clip. YouTube hardware decoding and physical GPU-driver faults require testing on the affected laptop.');
 }finally{if(app)await app.close();if(browser)await browser.close();await new Promise(r=>server.close(r));await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Video overlay::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
