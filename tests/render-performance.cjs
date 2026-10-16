// Force actual software rasterization: timing JS draw calls alone misses canvas cost.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{chromium}=require('playwright'),{createServer}=require('../server.cjs');
const {launch,pages,hidePanel}=require('./native-helpers.cjs');
(async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(process.platform==='win32'?chromium.executablePath():'/usr/bin/chromium'),headless:true,args:['--disable-gpu']});
try{const metrics=[];for(const dpr of [1,2]){const context=await browser.newContext({viewport:{width:1300,height:1000},deviceScaleFactor:dpr}),page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/roam/`);await page.waitForFunction(()=>window.__buildlingsFrame);const result=await page.evaluate(async dpr=>{
 const {MonkeyScene}=await import('/roam/assets/monkey.js'),fast=new MonkeyScene(document.createElement('div')),reference=new MonkeyScene(document.createElement('div'));reference.marker.cacheEnabled=false;
 const base={...window.__buildlingsFrame,walkWeight:.8,petWeight:0,dragWeight:0,reach:.3,scaleX:1,scaleY:1,hop:0,sparkleId:0};const vector=[],cached=[];
 for(let i=0;i<70;i++){
  const f={...base,x:500+i*.5,y:500,walkPhase:i*.12,lookX:Math.sin(i*.1),lookY:.2,lean:.2,tailPullX:Math.sin(i*.08)*15,tailPullY:0};
  for(const [scene,times]of (i%2?[[fast,cached],[reference,vector]]:[[reference,vector],[fast,cached]])){const start=performance.now();scene.draw(f,i*16.667);scene.ctx.getImageData(0,0,scene.canvas.width,scene.canvas.height);if(i>=10)times.push(performance.now()-start);}
 }
 let error=0,pixels=0;const a=fast.ctx.getImageData(0,0,fast.canvas.width,fast.canvas.height).data,b=reference.ctx.getImageData(0,0,reference.canvas.width,reference.canvas.height).data;
 for(let i=0;i<a.length;i+=4){if(a[i+3]<2&&b[i+3]<2)continue;pixels++;for(let k=0;k<4;k++)error+=Math.abs(k===3?a[i+k]-b[i+k]:a[i+k]*a[i+3]/255-b[i+k]*b[i+3]/255);}
 const summarize=a=>{a.sort((x,y)=>x-y);return{median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
 const beforeInk=fast.marker.ink;fast.setInk('white');fast.draw({...base,petWeight:.9,sheen:.8,sheenPhase:.4},1300);const white=fast.ctx.getImageData(0,0,fast.canvas.width,fast.canvas.height).data;let whitePixels=0;for(let i=0;i<white.length;i+=4)if(white[i]>200&&white[i+3]>200)whitePixels++;
 return{dpr,vector:summarize(vector),cached:summarize(cached),meanInkError:error/(pixels*4),cacheHits:fast.marker.cacheHits,cachePixels:fast.marker.cachePixels,whitePixels,beforeInk,afterInk:fast.marker.ink};
 },dpr);metrics.push(result);assert.ok(result.cacheHits>500);assert.ok(result.cachePixels<=2*1024*1024);assert.ok(result.meanInkError<12,'Cached ink differs materially from the original vector drawing: '+JSON.stringify(result));assert.ok(result.whitePixels>1000,'Changing marker colour left cached black ink');assert.notEqual(result.beforeInk,result.afterInk);assert.ok(result.cached.median<result.vector.median*.95,'Caching failed to reduce measured software draw time: '+JSON.stringify(result));await context.close();}
 await browser.close();
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-frame-'));let app;const native=[];
 try{
  app=await launch(temp);const p=await pages(app);await hidePanel(app);
  for(const phase of ['walking','quote-and-confetti']){
   if(phase!=='walking'){
    await app.evaluate(({app})=>{const r=app.__buildlingsRuntime;r.applyFocus({type:'quote',category:'everyday'});r.getRuntime().focus.events.push({type:'milestone',id:'performance-milestone',percent:50});r.tickFocus();});
    await p.effects.locator('.celebration-badge strong').waitFor({state:'visible'});assert.equal(await p.effects.locator('.celebration-badge strong').textContent(),'50% complete');assert.equal(await p.effects.locator('.celebration-piece[data-scope=monkey]').count(),48);
   }
   const sample=await p.pet.evaluate(()=>new Promise(resolve=>{const gaps=[];let start,last,painted=0,renderer;
    function frame(t){if(start===undefined)start=t;else gaps.push(t-last);last=t;if(renderer!==window.__buildlingsRenderer){painted++;renderer=window.__buildlingsRenderer;}if(t-start<3000)requestAnimationFrame(frame);else{gaps.sort((a,b)=>a-b);resolve({elapsed:t-start,painted,median:gaps[Math.floor(gaps.length*.5)],p95:gaps[Math.floor(gaps.length*.95)],cacheHits:renderer.cacheHits});}}requestAnimationFrame(frame);
   }));native.push({phase,...sample});assert.ok(sample.painted>50&&sample.p95<100,'Severe native animation stall: '+JSON.stringify(sample));assert.ok(sample.cacheHits>0);
  }
 }finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
 await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/render-performance.json',JSON.stringify({software:metrics,native},null,2));console.log(JSON.stringify({software:metrics,native},null,2));
 if(process.env.GITHUB_ACTIONS)console.log('::notice title=Rendering timings::'+JSON.stringify({software:metrics.map(m=>({dpr:m.dpr,vector:m.vector.median,cached:m.cached.median})),native}));
 console.log('PASS bounded ink cache reduces real software raster time at 1x/2x, preserves artwork/colour, and native painting continues during quote + triple confetti');
}finally{if(browser.isConnected())await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Marker performance::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
