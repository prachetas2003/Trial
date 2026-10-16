import {OverlayBar} from './hud.js';
const bar=new OverlayBar(window.companion);
window.companion.onInput(input=>{if(input.message)bar.showMessage(input.message);if(input.completion)bar.complete(input.completion);});
let last='',lastReport=0;
function measure(){requestAnimationFrame(measure);const now=performance.now();if(!bar.boundsDirty&&now-lastReport<1000)return;const r=bar.element.getBoundingClientRect(),key=[r.x,r.y,r.width,r.height].join();bar.boundsDirty=false;if(key!==last||now-lastReport>=1000){last=key;lastReport=now;window.companion.timerRect({x:r.x,y:r.y,width:r.width,height:r.height});}}
requestAnimationFrame(measure);window.companion.ready();
