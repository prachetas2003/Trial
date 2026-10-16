const {test}=require('node:test'),assert=require('node:assert/strict');
const {FrameClock}=require('../desktop/frame-clock.js');
test('60 fps painting and position reports stay near target on high-refresh displays',()=>{
 for(const hz of [60,120,144,165,240]){
  const c=new FrameClock(60);let paints=0;
  for(let i=0;i<hz*10;i++)if(c.due(i*1000/hz))paints++;
  assert.ok(paints>=599&&paints<=601,`${hz} Hz produced ${paints} frames instead of 600`);
 }
});
test('small alternating RAF jitter does not halve animation rate',()=>{
 const c=new FrameClock(60);let paints=0;
 for(let i=0;i<600;i++)if(c.due(i*1000/60+(i%2?-.9:.9)))paints++;
 assert.ok(paints>=598&&paints<=600,`${paints} frames painted`);
});
test('Safe Mode keeps 30 fps and a long sleep resumes without a catch-up burst',()=>{
 const c=new FrameClock(30);let paints=0;
 for(let i=0;i<600;i++)if(c.due(i*1000/60))paints++;
 assert.equal(paints,300);assert.equal(c.due(60000),true);assert.equal(c.due(60001),false);assert.equal(c.due(60034),true);
});
