(function(root){
 'use strict';const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const joint=()=>({value:0,velocity:0});
 function oscillate(s,target,k,d,dt){s.velocity+=((target-s.value)*k-s.velocity*d)*dt;s.value+=s.velocity*dt;}
 class PlayPhysics{
  constructor(){this.squash=joint();this.tailX=joint();this.tailY=joint();this.kind=null;this.samples=[];this.time=0;this.lastTime=null;this.enabled=true;}
  press(kind,p,now){this.kind=kind;this.start={...p};this.point={...p};this.samples=[{...p,now}];this.time=now;}
  move(p,now){this.point={...p};const last=this.samples.at(-1);if(last&&Math.hypot(last.x-p.x,last.y-p.y)<.25)return;this.samples.push({...p,now});this.samples=this.samples.filter(s=>now-s.now<=100).slice(-20);}
  velocity(now){const samples=this.samples.filter(s=>now-s.now<=100),a=samples[0],b=samples.at(-1);if(!a||!b||b.now-a.now<8)return{x:0,y:0};const dt=(b.now-a.now)/1000;return{x:clamp((b.x-a.x)/dt,-420,420),y:clamp((b.y-a.y)/dt,-360,360)};}
  release(){this.kind=null;}
  advance(now,petWeight=0,scale=1,reduced=false){
   let elapsed=Math.min(.06,Math.max(0,(now-(this.lastTime??now))/1000));this.lastTime=now;
   const squash=this.enabled&&this.kind==='squish'?.16:0;
   const dx=this.enabled&&this.kind==='tail'?clamp((this.point.x-this.start.x)/scale,-48,48):0,dy=this.enabled&&this.kind==='tail'?clamp((this.point.y-this.start.y)/scale,-42,42):0;
   while(elapsed>0){const dt=Math.min(elapsed,1/120);elapsed-=dt;oscillate(this.squash,squash,190,reduced?29:12,dt);oscillate(this.tailX,dx,90,reduced?22:7,dt);oscillate(this.tailY,dy,90,reduced?22:7,dt);}
   return{interaction:this.kind||'none',squash:clamp(this.squash.value,-.055,.22),tailPullX:clamp(this.tailX.value,-58,58),tailPullY:clamp(this.tailY.value,-50,50),sheen:this.enabled?clamp(petWeight,0,1):0,sheenPhase:(now%950)/950};
  }
 }
 const api={PlayPhysics};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MischiefPlay=api;
})(typeof window!=='undefined'?window:globalThis);
