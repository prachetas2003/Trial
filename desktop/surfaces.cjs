// Native hit surfaces are bounded; the monitor-size decoration window never takes input.
const PET = { width: 420, height: 400, footX: 210, footY: 350 };
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Electron's int32 converter rejects -0 as well as out-of-range numbers.
// Math.round(-0.1) is -0: normalize at every native positioning boundary.
function nativePoint(x,y){
 if(![x,y].every(Number.isFinite))return null;
 const values=[x,y].map(Math.round);
 if(!values.every(n=>n>=-2147483648&&n<=2147483647))return null;
 return{x:values[0]===0?0:values[0],y:values[1]===0?0:values[1]};
}
function petBounds(frame){const p=nativePoint(frame.x-PET.footX,frame.y-PET.footY);return p?{...p,width:PET.width,height:PET.height}:null;}
function timerBounds(areas, saved, activeId){
 const a=areas.find(a=>a.id===saved?.displayId)||areas.find(a=>a.id===activeId)||areas[0];
 const width=Math.min(660,a.width-16),height=Math.min(124,a.height);
 return{...nativePoint(a.x+clamp(saved?.x??.5,0,1)*Math.max(0,a.width-width),a.y+(saved?clamp(saved.y,0,1)*Math.max(0,a.height-height):4)),width,height};
}
function timerPosition(bounds,area){return{displayId:area.id,x:clamp((bounds.x-area.x)/Math.max(1,area.width-bounds.width),0,1),y:clamp((bounds.y-area.y)/Math.max(1,area.height-bounds.height),0,1)};}
module.exports={PET,nativePoint,petBounds,timerBounds,timerPosition};
