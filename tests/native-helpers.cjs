const assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process'),{_electron}=require('playwright');
const root=path.resolve(__dirname,'..');
async function until(check,timeout=15000){const end=Date.now()+timeout;do{if(await check())return;await new Promise(r=>setTimeout(r,70));}while(Date.now()<end);assert.fail('Native condition timed out');}
async function launch(temp,safe=false){const app=await _electron.launch({executablePath:require('electron'),args:['.',...(safe?['--safe-mode']:[]),...(process.platform==='linux'?['--disable-setuid-sandbox',...(safe?[]:['--use-angle=swiftshader'])]:[])],cwd:root,env:{...process.env,BUILDLINGS_TEST_DATA:temp},timeout:25000});await until(()=>app.evaluate(({app})=>!!app.__buildlingsRuntime?.getRuntime().focusWin?.isVisible()));return app;}
async function pages(app){
 // Electron creates replacements before Playwright has removed every closed page.
 // Bind to the current native window IDs, not the first page with the same URL.
 const end=Date.now()+15000;
 while(Date.now()<end){
  const ids=await app.evaluate(({app})=>{const r=app.__buildlingsRuntime.getRuntime(),id=w=>w&&!w.isDestroyed()?w.id:null;return{pet:id(r.win),timer:id(r.timerWin),effects:id(r.effectsWin),panel:id(r.focusWin)};});
  const entries=await Promise.all(app.windows().map(async page=>{try{const w=await app.browserWindow(page),id=await w.evaluate(w=>w.id);await w.dispose();return{id,page};}catch{return null;}}));
  const current=Object.fromEntries(Object.entries(ids).map(([role,id])=>[role,entries.find(e=>e&&e.id===id&&!e.page.isClosed())?.page]));
  if(current.pet&&!ids.timer&&!ids.effects&&(!ids.panel||current.panel)){
   await current.pet.waitForFunction(()=>window.__buildlingsFrame);await current.pet.locator('#bar-timer').waitFor({state:'attached'});
   return {...current,timer:current.pet,effects:current.pet};
  }
  if(current.pet&&current.timer&&current.effects&&(!ids.panel||current.panel)){
   try{await current.pet.waitForFunction(()=>window.__buildlingsFrame,null,{timeout:3000});await current.timer.locator('#bar-timer').waitFor({state:'attached',timeout:3000});const stable=await app.evaluate(({app},ids)=>{const r=app.__buildlingsRuntime.getRuntime();return r.win?.id===ids.pet&&r.timerWin?.id===ids.timer&&r.effectsWin?.id===ids.effects&&(!ids.panel||r.focusWin?.id===ids.panel);},ids);if(stable)return current;}
   catch(error){const replaced=await app.evaluate(({app},id)=>app.__buildlingsRuntime.getRuntime().win?.id!==id,ids.pet);if(!replaced&&!current.pet.isClosed()&&!current.timer.isClosed())throw error;}
  }
  await new Promise(r=>setTimeout(r,70));
 }
 assert.fail('Current native replacement windows did not become ready');
}
async function pointer(app,point,op='move',page){
 if(process.platform==='linux')await app.evaluate(({app,screen},p)=>{app.__cursor=p;screen.getCursorScreenPoint=()=>app.__cursor;},point);
 let physical=point;if(process.platform==='win32')physical=await app.evaluate(({screen},p)=>screen.dipToScreenPoint(p),{x:Math.round(point.x),y:Math.round(point.y)});
 const r=spawnSync(process.platform==='win32'?'python':'python3',[path.join(root,'scripts/test-pointer.py'),String(Math.round(physical.x)),String(Math.round(physical.y)),op],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 if(process.platform==='linux'&&page){const w=await app.browserWindow(page);await w.evaluate(w=>{w.setIgnoreMouseEvents(false);w.moveTop();});}
}
async function point(app,page,selector){const w=await app.browserWindow(page),b=await w.evaluate(w=>w.getBounds()),r=await page.locator(selector).boundingBox();assert.ok(r,selector+' is not visible');return{x:b.x+r.x+r.width/2,y:b.y+r.y+r.height/2};}
async function click(app,page,selector){const p=await point(app,page,selector);await pointer(app,p,'move',page);await page.waitForTimeout(120);await pointer(app,p,'click',page);await page.waitForTimeout(160);}
async function hidePanel(app){await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focusWin?.hide());}
async function action(app,a){return app.evaluate(({app},a)=>app.__buildlingsRuntime.applyFocus(a),a);}
async function toss(app,start,dx,dy){let p=start,end={x:start.x+dx,y:start.y+dy};if(process.platform==='win32'){p=await app.evaluate(({screen},p)=>screen.dipToScreenPoint(p),{x:Math.round(start.x),y:Math.round(start.y)});const q=await app.evaluate(({screen},p)=>screen.dipToScreenPoint(p),{x:Math.round(end.x),y:Math.round(end.y)});dx=q.x-p.x;dy=q.y-p.y;}const r=spawnSync(process.platform==='win32'?'python':'python3',[path.join(root,'scripts/test-pointer.py'),String(Math.round(p.x)),String(Math.round(p.y)),'toss',String(Math.round(dx)),String(Math.round(dy))],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);if(process.platform==='linux')await app.evaluate(({app},p)=>{app.__cursor=p;},end);}
module.exports={toss,launch,pages,pointer,point,click,hidePanel,action,until};
