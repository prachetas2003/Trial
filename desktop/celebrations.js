// Only small, short-lived DOM particles; no full-screen canvas or blurred layer.
export class Celebrations {
  constructor() { this.enabled=true; this.pending=null; this.seen=new Set(); this.pieces=new Set(); }
  configure(preferences) { this.enabled=preferences.celebrations !== false; if(!this.enabled){this.pending=null;for(const piece of this.pieces)piece.remove();this.pieces.clear();} }
  enqueue(event, now) {
    if(!this.enabled || this.seen.has(event.id))return;
    this.seen.add(event.id); if(this.seen.size>32)this.seen.delete(this.seen.values().next().value);
    this.pending={...event,at:now};
  }
  draw(frame, now, visible, reducedMotion) {
    const event=this.pending;if(!event)return;
    if(event.kind==='complete' && visible && now-event.at<4000 && (frame.returning || now-event.at<300))return;
    this.pending=null;
    const local=visible ? (event.kind==='complete'?14:10) : 0, screen=event.kind==='complete'?34:0;
    if(!local&&!screen)return;
    const x=Math.max(16,Math.min(innerWidth-16,frame.x)),y=Math.max(80,Math.min(innerHeight-20,frame.y-105*frame.scale));
    if(reducedMotion){const badge=document.createElement('span');badge.className='celebration-badge';badge.textContent=event.kind==='complete'?'Session complete ✓':`${event.percent}% ✓`;badge.style.left=x+'px';badge.style.top=y+'px';this.add(badge,1700);}
    else {
      for(let i=0;i<local+screen;i++) {
        const near=i<local, p=document.createElement('i');p.className='celebration-piece';p.dataset.scope=near?'monkey':'screen';
        const px=near?x:innerWidth*(.12+Math.random()*.76),py=near?y:innerHeight*(.08+Math.random()*.28);
        const dx=near?(Math.random()-.5)*100*frame.scale:(Math.random()-.5)*160;
        const dy=near?-35-Math.random()*45*frame.scale:innerHeight*.55;
        for(const [key,value]of Object.entries({x:px+'px',y:py+'px',dx:dx+'px',dy:dy+'px',spin:(Math.random()*380-190)+'deg',size:(near?4+Math.random()*3:5+Math.random()*3)+'px',duration:near?'1100ms':'2300ms'}))p.style.setProperty('--'+key,value);
        p.style.background=['#dc9268','#d9bb72','#97b9aa','#abb4ca'][i%4];this.add(p,near?1200:2400);
      }
    }
    window.__mischiefCelebration={id:event.id,kind:event.kind,percent:event.percent,local,screen,reducedMotion,x,y};
    return event.kind==='complete';
  }
  add(piece, duration) {piece.setAttribute('aria-hidden','true');document.body.append(piece);this.pieces.add(piece);setTimeout(()=>{piece.remove();this.pieces.delete(piece);},duration);}
}
