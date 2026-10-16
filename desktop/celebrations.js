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
    const local=visible ? (event.kind==='complete'?42:48) : 0, screen=event.kind==='complete'?102:0;
    if(!local&&!screen)return;
    // Peeking feet can lie outside the work area: keep the whole local burst inside.
    const margin=Math.min(128,innerWidth/2), top=Math.min(160,innerHeight/3);
    const x=Math.max(margin,Math.min(innerWidth-margin,frame.x)),y=Math.max(top,Math.min(innerHeight-65,frame.y-105*frame.scale));
    const fragment=document.createDocumentFragment(),badge=document.createElement('aside');badge.className='celebration-badge';badge.setAttribute('role','status');badge.setAttribute('aria-live','polite');
    const title=event.kind==='complete'?'Session complete':`${event.percent}% complete`;
    const detail=event.kind==='complete'?'You followed through.':({25:'One quarter done.',50:'Halfway there.',75:'Three quarters done.'}[event.percent]||'Keep going, one step at a time.');
    badge.innerHTML='<span class="celebration-check" aria-hidden="true">✓</span><span class="celebration-copy"><strong></strong><small></small></span>';
    badge.querySelector('strong').textContent=title;badge.querySelector('small').textContent=detail;
    const badgeBottom=Math.max(88,Math.min(innerHeight-18,frame.y-(210+(frame.hop||0))*(frame.scale||1)-12));
    badge.style.left=x+'px';badge.style.top=badgeBottom+'px';this.add(badge,3200,fragment);
    if(!reducedMotion) {
      for(let i=0;i<local+screen;i++) {
        const near=i<local, p=document.createElement('i');p.className='celebration-piece';p.dataset.scope=near?'monkey':'screen';
        const px=near?x:innerWidth*(.12+Math.random()*.76),py=near?y:innerHeight*(.08+Math.random()*.28);
        const dx=near?(Math.random()-.5)*120:(Math.random()-.5)*160;
        const dy=near?-50-Math.random()*45:innerHeight*.55;
        for(const [key,value]of Object.entries({x:px+'px',y:py+'px',dx:dx+'px',dy:dy+'px',spin:(Math.random()*380-190)+'deg',size:(near?7+Math.random()*3:5+Math.random()*3)+'px',duration:near?'2000ms':'2300ms'}))p.style.setProperty('--'+key,value);
        p.style.background=['#ffb36b','#f4cf66','#8fd5bb','#c0b3ef'][i%4];this.add(p,near?2200:2400,fragment);
      }
    }
    document.body.append(fragment);
    window.__mischiefCelebration={id:event.id,kind:event.kind,percent:event.percent,local,screen,reducedMotion,x,y};
    return event.kind==='complete';
  }
  add(piece, duration, parent=document.body) {if(piece.classList.contains('celebration-piece'))piece.setAttribute('aria-hidden','true');parent.append(piece);this.pieces.add(piece);setTimeout(()=>{piece.remove();this.pieces.delete(piece);},duration);}
}
