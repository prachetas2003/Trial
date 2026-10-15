// Native hit surfaces are bounded; the monitor-size decoration window never takes input.
const PET = { width: 420, height: 400, footX: 210, footY: 350 };
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function petBounds(frame){return{x:Math.round(frame.x-PET.footX),y:Math.round(frame.y-PET.footY),width:PET.width,height:PET.height};}
function timerBounds(areas, saved, activeId){
 const a=areas.find(a=>a.id===saved?.displayId)||areas.find(a=>a.id===activeId)||areas[0];
 const width=Math.min(660,a.width-16),height=Math.min(124,a.height);
 return{x:Math.round(a.x+clamp(saved?.x??.5,0,1)*Math.max(0,a.width-width)),y:Math.round(a.y+(saved?clamp(saved.y,0,1)*Math.max(0,a.height-height):4)),width,height};
}
function timerPosition(bounds,area){return{displayId:area.id,x:clamp((bounds.x-area.x)/Math.max(1,area.width-bounds.width),0,1),y:clamp((bounds.y-area.y)/Math.max(1,area.height-bounds.height),0,1)};}
module.exports={PET,petBounds,timerBounds,timerPosition};
