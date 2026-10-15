// Regressions from the 0.10.0 device report: native -0, lost topmost and unlock.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {launch,pages,pointer,point,click,hidePanel,until}=require('./native-helpers.cjs');
(async()=>{const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-regressions-'));let app;
try{
 app=await launch(temp);const p=await pages(app);await hidePanel(app);
 await app.evaluate(({app})=>{const w=app.__buildlingsRuntime.getRuntime().win,move=w.setPosition.bind(w);w.__moves=[];w.setPosition=(x,y,...rest)=>{w.__moves.push({x,y,negativeZero:Object.is(x,-0)||Object.is(y,-0)});return move(x,y,...rest);};});
 for(const [x,y] of [[209.8,349.8],[210.2,350.2],[209,349],[209.9,350.1]]){
  await p.pet.evaluate(({x,y})=>{const m=window.__buildlingsEngine;m.pause(true,performance.now());m.returning=false;m.x=m.previous.x=x;m.y=m.previous.y=y;m.vx=m.vy=0;m.target={x,y};}, {x,y});
  await until(()=>app.evaluate(({app},target)=>{const b=app.__buildlingsRuntime.getRuntime().win.getBounds();return b.x===target.x&&b.y===target.y;},{x:Math.round(x-210)||0,y:Math.round(y-350)||0}));
 }
 const moves=await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.__moves);assert.ok(moves.some(p=>p.x===0&&p.y===0));assert.ok(moves.every(p=>!p.negativeZero));
 await p.pet.evaluate(async()=>{const f=window.__buildlingsFrame;window.companion.report({...f,x:1e50,renderer:'canvas2d'});await window.companion.getFocusState();});
 assert.ok((await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().win.__moves)).every(p=>Math.abs(p.x)<=2147483648));
 console.log('PASS real native pet movement across both zero axes, with invalid positions rejected before Electron');
 for(const locked of [true,false,true,false]){
  const at=await point(app,p.timer,'#bar-lock');await pointer(app,at,'move',p.timer);await p.timer.waitForTimeout(120);await pointer(app,at,'down',p.timer);
  await p.timer.evaluate(()=>window.__pressedLock=document.querySelector('#bar-lock svg'));
  await app.evaluate(({app})=>app.__buildlingsRuntime.tickFocus());await p.timer.waitForTimeout(1100);
  assert.equal(await p.timer.evaluate(()=>window.__pressedLock===document.querySelector('#bar-lock svg')),true);
  await pointer(app,at,'up',p.timer);await p.timer.waitForFunction(v=>document.querySelector('#bar-lock').getAttribute('aria-pressed')===String(v),locked);
  assert.equal(await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().focus.preferences.timerLocked),locked);
 }
 const before=await app.evaluate(({app})=>app.__buildlingsRuntime.getRuntime().timerWin.getBounds()),at=await point(app,p.timer,'#bar-grip');
 await pointer(app,at,'move',p.timer);await p.timer.waitForTimeout(120);await pointer(app,at,'down',p.timer);await pointer(app,{x:at.x+60,y:at.y+90},'move',p.timer);await p.timer.waitForTimeout(150);await pointer(app,{x:at.x+60,y:at.y+90},'up',p.timer);
 await until(()=>app.evaluate(({app},y)=>app.__buildlingsRuntime.getRuntime().timerWin.getBounds().y>y+60,before.y));
 console.log('PASS repeated native lock/unlock clicks held across clock updates, and dragging works again after unlock');
 await click(app,p.timer,'#bar-timer');assert.equal(await p.panel.locator('#start-form').isVisible(),true);
 console.log('PASS timer still opens controls after zero crossings and repeated position locks');
}finally{if(app)await app.close();await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);if(process.env.GITHUB_ACTIONS)console.log('::error title=Reported desktop regressions::'+e.stack.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));process.exitCode=1;});
