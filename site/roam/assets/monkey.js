// Original marker artwork. Curves, ink grain, and poses are authored here;
// no sprite sheet, generated image, CDN, or per-frame random texture.
const { spring, WINDOW } = window.BuildlingsMotion;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const joint = () => ({ value: 0, velocity: 0 });
const INK = '#191619', ORANGE = '#ff7546';

function curves(start, ...segments) {
  const points = [start]; let a = start;
  for (const [bx, by, cx, cy, dx, dy] of segments) {
    const steps = Math.max(12, Math.ceil((Math.hypot(bx-a[0], by-a[1]) + Math.hypot(cx-bx, cy-by) + Math.hypot(dx-cx, dy-cy)) / 5));
    for (let i=1; i<=steps; i++) {
      const t=i/steps, u=1-t;
      points.push([u*u*u*a[0]+3*u*u*t*bx+3*u*t*t*cx+t*t*t*dx, u*u*u*a[1]+3*u*u*t*by+3*u*t*t*cy+t*t*t*dy]);
    }
    a=[dx,dy];
  }
  return points;
}
function ellipse(x,y,rx,ry,tilt=0) {
  return Array.from({length:65},(_,i)=> {
    const a=i/64*Math.PI*2, px=Math.cos(a)*rx, py=Math.sin(a)*ry;
    return [x+px*Math.cos(tilt)-py*Math.sin(tilt),y+px*Math.sin(tilt)+py*Math.cos(tilt)];
  });
}
function path(points) {
  const p=new Path2D();p.moveTo(...points[0]);for(const point of points.slice(1))p.lineTo(...point);return p;
}

class Marker {
  constructor(ctx) {
    this.ctx=ctx;this.strokes=0;this.ink=INK;
    const grain=document.createElement('canvas');grain.width=grain.height=64;
    const g=grain.getContext('2d');let seed=421;
    for(let i=0;i<310;i++) {
      seed=(seed*1664525+1013904223)>>>0;const x=seed%64;
      seed=(seed*1664525+1013904223)>>>0;const y=seed%64;
      g.fillStyle=i%4?'rgba(255,255,255,.055)':'rgba(0,0,0,.07)';
      g.fillRect(x,y,i%5===0?2:.7,.6);
    }
    this.grain=ctx.createPattern(grain,'repeat');
  }
  stroke(points,width=7,color=INK,seed=0,gloss=true) {
    const c=this.ctx, left=[],right=[], outline=color===INK;this.strokes++;
    if(outline)color=this.ink;
    for(let i=0;i<points.length;i++) {
      const a=points[Math.max(0,i-1)], b=points[Math.min(points.length-1,i+1)], len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
      const radius=width/2*(1+.065*Math.sin(i*.29+seed)+.025*Math.sin(i*.83+seed*2));
      const nx=-(b[1]-a[1])/len,ny=(b[0]-a[0])/len;
      left.push([points[i][0]+nx*radius,points[i][1]+ny*radius]);
      right.push([points[i][0]-nx*radius,points[i][1]-ny*radius]);
    }
    const ribbon=path([...left,...right.reverse()]);ribbon.closePath();
    c.save();c.fillStyle=color;c.shadowColor='rgba(20,12,21,.20)';c.shadowBlur=1.8;c.shadowOffsetX=.7;c.shadowOffsetY=1.1;
    c.fill(ribbon);c.beginPath();c.arc(...points[0],width/2,0,Math.PI*2);c.arc(...points.at(-1),width/2,0,Math.PI*2);c.fill();
    c.shadowColor='transparent';
    // A fine warm edge catches the glass light and keeps black ink readable
    // over dark editors without an opaque sticker backing or a glow cloud.
    if(outline){c.lineWidth=.85;c.strokeStyle='rgba(255,242,226,.38)';c.stroke(ribbon);}
    c.clip(ribbon);c.fillStyle=this.grain;c.fillRect(-350,-400,700,800);
    if(gloss) {
      // Small broken glints and lengthwise nib streaks, anchored to each stroke.
      c.lineCap='round';c.lineJoin='round';c.lineWidth=Math.max(.65,width*.105);
      c.strokeStyle=outline?(this.ink===INK?'rgba(255,245,247,.23)':'rgba(255,255,255,.60)'):'rgba(255,247,222,.43)';
      for(let k=0;k<2;k++) {
        const from=Math.floor(points.length*(k===0?.10:.62)),to=Math.floor(points.length*(k===0?.36:.77));
        const segment=points.slice(from,to).map(([x,y])=>[x-width*.16,y-width*.23]);
        if(segment.length>1)c.stroke(path(segment));
      }
      c.lineWidth=.55;c.strokeStyle='rgba(16,8,20,.08)';c.stroke(path(points.map(([x,y])=>[x+width*.21,y])));
    }
    c.restore();
  }
  dot(x,y,r=4,color=INK) {this.stroke([[x,y],[x+.15,y+.1]],r*2,color,8);}
}

export class MonkeyScene {
  constructor(host) {
    this.canvas=document.createElement('canvas');this.canvas.id='pet-canvas';
    this.canvas.setAttribute('aria-label','Mischief, your marker-doodle monkey');host.replaceChildren(this.canvas);
    this.ctx=this.canvas.getContext('2d',{alpha:true});if(!this.ctx)throw new Error('Canvas 2D is unavailable.');
    this.footX=WINDOW.footX;this.footY=WINDOW.footY;this.lastTime=null;this.lastSparkle=0;this.particles=[];
    this.reach=joint();this.head=joint();this.tail=joint();this.look=joint();this.nextBlink=4000;this.blinkStart=-10000;
    this.feet=[{side:-1,stance:false,anchorX:0,anchorY:0},{side:1,stance:false,anchorX:0,anchorY:0}];
    this.resize();
    this.ink='black';
  }
  resize() {
    this.ratio=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(WINDOW.width*this.ratio);this.canvas.height=Math.round(WINDOW.height*this.ratio);
    this.marker=new Marker(this.ctx);
    this.setInk(this.ink);
  }
  setInk(value) {this.ink=value==='white'?'white':'black';this.marker.ink=this.ink==='white'?'#f6eadc':INK;}
  setPet() {} // This release deliberately contains only the monkey.
  emit(now) {
    for(let i=0;i<6;i++)this.particles.push({born:now,index:i,x:104+i*21,y:181-(i%3)*20});
  }
  hand(x,y,angle=0,size=1) {
    const c=this.ctx,m=this.marker;c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
    m.stroke(curves([-7,4],[-12,0,-9,-9,-4,-8],[-4,-15,2,-14,3,-7],[8,-13,13,-8,10,-3],[16,-5,16,3,9,7],[3,12,-3,10,-7,4]),5.4,INK,12);
    m.stroke(curves([-2,2],[0,0,3,-1,6,0]),1.9,INK,4,false);c.restore();
  }
  draw(frame,now) {
    if(this.ratio!==Math.min(window.devicePixelRatio||1,2))this.resize();
    const c=this.ctx,m=this.marker,dt=this.lastTime===null?1/60:clamp((now-this.lastTime)/1000,0,.06);this.lastTime=now;
    const happy=clamp(frame.petWeight,0,1),walk=clamp(frame.walkWeight,0,1),phase=frame.walkPhase;
    const reach=spring(this.reach,frame.reach,17,dt),head=spring(this.head,frame.lookX*.055+frame.lean*.06,12,dt);
    const tail=spring(this.tail,-frame.lean*.16+Math.sin(now/1100)*.025+happy*.10,8,dt);
    const bob=Math.abs(Math.sin(phase))*2.7*walk,breath=Math.sin(now/1050)*.6;
    c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,WINDOW.width,WINDOW.height);m.strokes=0;
    c.save();c.translate(160,336-frame.hop);c.scale(frame.scaleX,frame.scaleY);c.translate(-160,-336);
    // The tail follows the body, and stays behind the head and shirt.
    c.save();c.translate(182,286);c.rotate(tail);c.translate(-182,-286);
    m.stroke(curves([182,286],[207,313,246,316,264,283],[278,255,277,220,258,212],[241,203,225,217,229,232],[233,247,253,246,256,233],[259,225,254,221,249,223]),8.2,INK,3);
    c.restore();
    const air=frame.jumpPhase==='air';
    for(let i=0;i<2;i++) {
      const foot=this.feet[i],side=foot.side,cycle=((phase/(Math.PI*2)+i*.5)%1+1)%1;
      const stance=walk>.15&&!air&&cycle<.60,baseX=160+side*20;
      if(stance&&!foot.stance) {
        const speed=Math.hypot(frame.vx,frame.vy)||1;
        foot.anchorX=frame.x+side*20+frame.vx/speed*13;foot.anchorY=frame.y+frame.vy/speed*7;
      }
      let fx=baseX+side*5+Math.sin(phase+i*Math.PI)*13*walk,fy=331-Math.max(0,Math.sin(phase+i*Math.PI))*12*walk;
      if(stance){fx=clamp(160+foot.anchorX-frame.x,baseX-21,baseX+21);fy=331+clamp(foot.anchorY-frame.y,-7,7);}
      if(air){fx+=side*14;fy-=12;}
      foot.stance=stance;
      m.stroke(curves([160+side*13,291],[160+side*20,306,fx-side*12,fy-8,fx,fy]),6.5,INK,i+8);
      m.stroke(curves([fx-side*2,fy-3],[fx+side*15,fy-5,fx+side*19,fy+4,fx+side*10,fy+5],[fx+side*4,fy+7,fx-side*3,fy+4,fx-side*2,fy-3]),6.2,INK,i+6);
    }
    c.save();c.translate(160,288);c.rotate(-frame.lean*.08-Math.sin(phase)*.035*walk-reach*.045);c.translate(-160,-288-bob+happy*2-breath);
    const swing=Math.sin(phase)*14*walk;
    const leftHand={x:112+swing*.5-happy*4,y:291-swing-happy*10};
    m.stroke(curves([139,254],[117,256,108,271,leftHand.x,leftHand.y]),6.6,INK,6);this.hand(leftHand.x,leftHand.y,-.28);
    // Loose orange marker hatching remains attached to the shirt as it flexes.
    for(let i=0;i<7;i++) {
      const y=250+i*6.1,half=17+(y-250)*.11;
      m.stroke(curves([160-half,y+2],[150,y-2,172,y+4,160+half,y]),9.1,i%3===0?'#ff8751':ORANGE,i+2);
    }
    m.stroke(curves([144,245],[143,258,136,279,135,293],[149,302,173,303,186,295],[181,278,180,256,176,244]),6.8,INK,2);
    m.stroke(curves([146,246],[153,255,168,254,176,245]),5.5,INK,7);
    // A tiny hand-lettered star; orange remains the only dominant accent.
    m.stroke([[160,265],[162,272],[169,273],[163,277],[164,284],[159,280],[153,283],[155,276],[150,272],[157,271],[160,265]],2.5,INK,2,false);
    const rightHand={x:205+reach*24+happy*1,y:281-reach*23+swing*.6-happy*12};
    m.stroke(curves([180,254],[198+reach*9,253-reach*8,204+reach*18,263-reach*21,rightHand.x,rightHand.y]),6.6+reach*.7,INK,10);
    c.save();c.translate(160,200);c.rotate(head+Math.sin(now/1400)*.009-happy*.035);c.translate(-160,-200+happy*3);
    // Large loop ears and an asymmetrical head, left unfilled like ink on glass.
    m.stroke(ellipse(108,205,14,18,-.25),7,INK,7);m.stroke(curves([111,198],[99,196,100,211,108,213]),3.4,INK,5);
    m.stroke(ellipse(212,203,14,17,.20),7.2,INK,8);m.stroke(curves([210,197],[221,194,222,209,213,211]),3.4,INK,4);
    m.stroke(curves([158,156],[130,154,114,172,116,201],[109,226,132,247,160,246],[190,249,206,227,205,199],[207,171,185,152,158,156]),8.5,INK,1);
    m.stroke(curves([156,157],[146,147,153,143,165,146],[169,136,182,142,178,154]),6.5,INK,4);
    // Heart-shaped monkey brow and cheek line, rather than a generic round face.
    m.stroke(curves([128,202],[120,174,148,172,160,190],[172,170,196,177,193,201]),4.1,INK,6);
    const look=spring(this.look,frame.lookX*3,18,dt),eyeY=frame.lookY*1.8;
    if(now>this.nextBlink&&happy<.4){this.blinkStart=now;this.nextBlink=now+4300+Math.random()*4300;}
    const blinkT=(now-this.blinkStart)/170,blink=blinkT>=0&&blinkT<=1?Math.sin(Math.PI*blinkT):0;
    for(const side of [-1,1]) {
      const x=160+side*17+look,y=199+eyeY;
      if(happy>.5)m.stroke(curves([x-4,y+2],[x-2,y-4,x+3,y-4,x+5,y+1]),3.9,INK,9,false);
      else {c.save();c.translate(x,y);c.scale(1,Math.max(.07,1-blink));m.dot(0,0,3.8);c.restore();}
    }
    m.stroke(curves([156,211],[160,214,163,213,165,210]),3.2,INK,4,false);
    m.stroke(curves([138,218],[140,234,177+happy*4,237,183,215]),5.2,INK,4);
    m.stroke(curves([133,216],[136,214,139,214,142,215]),2.4,INK,1,false);
    m.stroke(curves([180,214],[183,211,187,212,189,214]),2.4,INK,2,false);
    m.stroke(curves([126,210],[128,213,131,212,133,214]),3,'#ff896a',5,false);
    m.stroke(curves([189,209],[192,211,195,210,197,212]),3,'#ff896a',5,false);
    c.restore();
    this.hand(rightHand.x,rightHand.y,.22-reach*.5,1+reach*.68);
    c.restore();c.restore();
    if(frame.sparkleId>this.lastSparkle){this.lastSparkle=frame.sparkleId;this.emit(now);}
    this.particles=this.particles.filter(p=>now-p.born<1100);
    for(const p of this.particles) {
      const t=(now-p.born)/1100,x=p.x+(p.index-2.5)*13*t,y=p.y-28*t+16*t*t,draw=clamp(t*7,0,1);
      c.save();c.globalAlpha=Math.sin(Math.PI*t)*.9;c.translate(x,y);c.rotate((p.index-2)*.16);
      const star=[[0,-6],[1.5,-1.5],[6,0],[1.5,1.5],[0,6],[-1.5,1.5],[-6,0],[-1.5,-1.5],[0,-6]];
      m.stroke(star.slice(0,Math.max(2,Math.ceil(star.length*draw))),2.3,p.index%2?ORANGE:INK,p.index,false);c.restore();
    }
    window.__buildlingsRenderer={type:'canvas2d',art:'original-marker-monkey',ink:this.ink,rigged:true,textureStable:true,pixelRatio:this.ratio,canvasWidth:WINDOW.width,canvasHeight:WINDOW.height,
      strokes:m.strokes,particles:this.particles.length,petWeight:happy,reachWeight:reach,handScale:1+reach*.68,tailBend:tail,footX:this.footX,footY:this.footY};
  }
}
