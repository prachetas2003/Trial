const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createStorage}=require('../desktop/storage.cjs');
test('rapid preference updates coalesce and flush persists the latest saved work', async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mischief-storage-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const store=createStorage(dir,{delay:500});
  for(let i=0;i<100;i++)store.write('focus.json',{size:i,notes:['Keep my idea']});
  await store.flush();assert.equal(store.stats().writes,1);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(dir,'focus.json'))),{size:99,notes:['Keep my idea']});
});
test('a save queued during an in-flight save wins without blocking event-loop work',async()=>{
  let release;const gate=new Promise(resolve=>release=resolve);const writes=[];
  const io={mkdir:async()=>{},writeFile:async(_file,value)=>{writes.push(JSON.parse(value));if(writes.length===1)await gate;},rename:async()=>{}};
  const store=createStorage('/test',{io,delay:500});store.write('focus.json',{value:1});const flushing=store.flush();
  await new Promise(resolve=>setImmediate(resolve));store.write('focus.json',{value:2});store.write('focus.json',{value:3});release();await flushing;
  assert.deepEqual(writes,[{value:1},{value:3}]);await store.flush();
});
test('failed replacement is reported and a later save can succeed',async()=>{
  let fail=true;const errors=[];const io={mkdir:async()=>{},writeFile:async()=>{if(fail)throw new Error('Disk unavailable');},rename:async()=>{}};
  const store=createStorage('/test',{io,onError:e=>errors.push(e.message),delay:500});store.write('focus.json',{});await store.flush();assert.deepEqual(errors,['Disk unavailable']);
  fail=false;store.write('focus.json',{saved:true});await store.flush();assert.equal(store.stats().writes,1);
});
