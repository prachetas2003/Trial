const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FocusCompanion, MINUTE } = require('../desktop/focus.js');
const bank = require('../desktop/quotes.js');
const make = saved => new FocusCompanion({ bank, saved, random: () => .43, now: 1000 });
test('focus clock freezes on pause and excludes paused time from the saved summary', () => {
  const f = make(); f.dispatch({ type: 'start', intention: 'Ship the drawing' }, 1000);
  f.dispatch({ type: 'pause' }, 11000); assert.equal(f.snapshot(90000).session.remainingMs, 25 * MINUTE - 10000);
  assert.throws(() => f.dispatch({ type: 'stay' }, 90000), /resume/);
  f.dispatch({ type: 'resume' }, 100000); f.dispatch({ type: 'end' }, 106000);
  assert.equal(f.history[0].elapsedMs, 16000); assert.equal(f.history[0].completed, false); assert.equal(f.history[0].intention, 'Ship the drawing');
});
test('expiry records exactly one result and starts no new session automatically', () => {
  const f = make(); f.dispatch({ type: 'preferences', values: { focusMinutes: 1 } }, 1000); f.dispatch({ type: 'start' }, 1000);
  f.tick(70000); f.tick(100000); f.dispatch({ type: 'end' }, 110000);
  assert.equal(f.history.length, 1); assert.equal(f.history[0].elapsedMs, MINUTE); assert.equal(f.history[0].completed, true); assert.equal(f.session, null);
  assert.equal(f.drainEvents().filter(e => e.type === 'finished').length, 1);
});
test('only deliberate choices inside a running focus session count; duplicate presses are coalesced', () => {
  const f = make(); assert.throws(() => f.dispatch({ type: 'stay' }, 1000), /Start/);
  f.dispatch({ type: 'start' }, 1000); f.dispatch({ type: 'stay' }, 1001);
  assert.throws(() => f.dispatch({ type: 'stay' }, 1200), /Already counted/); assert.equal(f.session.choices, 1);
  f.dispatch({ type: 'stay' }, 4000); assert.equal(f.session.choices, 2);
  const quotes = f.drainEvents().filter(e => e.type === 'quote'); assert.equal(quotes.length, 2); assert.notEqual(quotes[0].quote.id, quotes[1].quote.id); assert.ok(quotes.every(e => e.quote.author));
  f.dispatch({ type: 'end' }, 5000); assert.equal(f.history[0].choices, 2);
  f.dispatch({ type: 'start', kind: 'break' }, 6000); assert.throws(() => f.dispatch({ type: 'stay' }, 10000), /focus/);
  f.dispatch({ type: 'end' }, 11000); assert.equal(f.history.length, 1);
});
test('restart restores thoughts, preferences, choices and a paused checkpoint without adding closed-app time', () => {
  const f = make(); f.dispatch({ type: 'preferences', values: { presence: 'peek', focusMinutes: 40 } }, 1000);
  f.dispatch({ type: 'note-add', text: '<img src=x onerror=alert(1)>\nAn idea for later' }, 1000);
  f.dispatch({ type: 'start', intention: 'My own work' }, 1000); f.dispatch({ type: 'stay' }, 2000);
  const restored = new FocusCompanion({ saved: JSON.parse(JSON.stringify(f.export(11000))), bank, now: 9999999 });
  assert.equal(restored.session.running, false); assert.equal(restored.snapshot(19999999).session.elapsedMs, 10000); assert.equal(restored.session.choices, 1); assert.equal(restored.recovered, true);
  assert.equal(restored.notes[0].text, '<img src=x onerror=alert(1)>\nAn idea for later'); assert.equal(restored.preferences.focusMinutes, 40); assert.equal(restored.preferences.presence, 'peek');
  restored.dispatch({ type: 'note-toggle', id: restored.notes[0].id }, 9999999); assert.equal(restored.notes[0].done, true);
  restored.dispatch({ type: 'note-delete', id: restored.notes[0].id }, 9999999); assert.equal(restored.notes.length, 0);
});
test('both quote decks exhaust before repeating and survive a restart', () => {
  for (const category of ['everyday', 'hard']) {
    const f = make(); const first = f.quote(category, 1000).id;
    const resumed = make(f.export(1000)); const ids = [first];
    for (let i = 1; i < bank[category].length; i++) ids.push(resumed.quote(category, 1000).id);
    assert.equal(new Set(ids).size, bank[category].length); assert.notEqual(resumed.quote(category, 1000).id, ids.at(-1));
  }
});
test('long breaks follow each fourth completion even after history reaches its retention limit', () => {
  const f = make(); f.dispatch({ type: 'preferences', values: { focusMinutes: 1 } }, 1000);
  for (let i = 0; i < 52; i++) { const now = 1000 + i * 70000; f.dispatch({ type: 'start' }, now); f.tick(now + MINUTE); }
  assert.equal(f.history.length, 50); assert.equal(f.completedSessions, 52);
  const resumed = make(f.export(4000000)); resumed.dispatch({ type: 'start', kind: 'break' }, 4000000); assert.equal(resumed.session.planMs, 15 * MINUTE);
});
test('invalid saved preferences cannot create unbounded clocks or inject unknown quote IDs', () => {
  const f = make({ preferences: { focusMinutes: Infinity, breakMinutes: -500, presence: 'anything' }, decks: { hard: ['H999', 'H001', 'H001'] }, notes: [null, { id: 'valid', text: 'hi' }] });
  assert.equal(f.preferences.focusMinutes, 25); assert.equal(f.preferences.breakMinutes, 1); assert.equal(f.preferences.presence, 'wander'); assert.equal(f.notes.length, 1);
  assert.equal(f.quote('hard').id, 'H001'); assert.throws(() => f.dispatch({ type: 'note-add', text: ' ' }), /Write/);
});
test('retrieving during focus overrides only this session; the next session still tucks away', () => {
  const f = make(); f.dispatch({ type: 'start' }, 1000); assert.equal(f.presence(), 'peek');
  f.dispatch({ type: 'presence', value: 'wander' }, 2000); assert.equal(f.presence(), 'wander'); assert.equal(f.preferences.peekDuringFocus, true);
  const restored = make(f.export(3000)); assert.equal(restored.presence(), 'wander');
  f.dispatch({ type: 'end' }, 4000); assert.equal(f.presence(), 'wander');
  f.dispatch({ type: 'start' }, 5000); assert.equal(f.presence(), 'peek');
});
test('explicit tuck returns after focus while complete hiding and opt-out remain respected', () => {
  for (const end of ['end', 'tick']) {
    const f = make(); f.dispatch({ type: 'preferences', values: { focusMinutes: 1 } }, 1000);
    f.dispatch({ type: 'presence', value: 'peek' }, 1000); f.dispatch({ type: 'start' }, 1000);
    if (end === 'end') f.dispatch({ type: 'end' }, 2000); else f.tick(61000);
    assert.equal(f.presence(), 'wander');
  }
  const f = make(); f.dispatch({ type: 'start' }, 1000); f.dispatch({ type: 'presence', value: 'hidden' }, 2000); f.dispatch({ type: 'end' }, 3000);
  assert.equal(f.presence(), 'hidden');
  f.dispatch({ type: 'preferences', values: { returnAfterSession: false, presence: 'wander' } }, 4000); f.dispatch({ type: 'start' }, 4000); f.dispatch({ type: 'end' }, 5000); assert.equal(f.presence(), 'peek');
});
test('continuous chase persists through restart and session completion; explicit tuck turns it off', () => {
  const f = make(); f.dispatch({ type: 'start' }, 1000); f.dispatch({ type: 'chase' }, 2000);
  assert.equal(f.presence(), 'wander'); assert.equal(f.preferences.chaseCursor, true);
  const restored = make(f.export(3000)); assert.equal(restored.preferences.chaseCursor, true); assert.equal(restored.presence(), 'wander');
  f.dispatch({ type: 'end' }, 4000); assert.equal(f.preferences.chaseCursor, true);
  f.dispatch({ type: 'presence', value: 'peek' }, 5000); assert.equal(f.preferences.chaseCursor, false); assert.equal(f.presence(), 'peek');
});
test('quote frequency, edge location and interactive preferences reject invalid saved values', () => {
  const f = make({ preferences: { quoteSeconds: -40, edge: 'unknown', edgePosition: 20, dragEnabled: 'yes', completionSound: false } });
  assert.equal(f.preferences.quoteSeconds, 12); assert.equal(f.preferences.edge, 'right'); assert.equal(f.preferences.edgePosition, 1); assert.equal(f.preferences.dragEnabled, true); assert.equal(f.preferences.completionSound, false);
  f.dispatch({ type: 'preferences', values: { quoteSeconds: Infinity, edgePosition: -20 } }, 1000); assert.equal(f.preferences.quoteSeconds, 12); assert.equal(f.preferences.edgePosition, 0);
});
test('break expiry and early ending have distinct completion events for sound', () => {
  const f = make(); f.dispatch({ type: 'preferences', values: { breakMinutes: 1 } }, 1000);
  f.dispatch({ type: 'start', kind: 'break' }, 1000); f.dispatch({ type: 'end' }, 2000);
  assert.equal(f.drainEvents().find(e => e.type === 'break-finished').completed, false);
  f.dispatch({ type: 'start', kind: 'break' }, 3000); f.tick(63000); f.tick(64000);
  const events = f.drainEvents().filter(e => e.type === 'break-finished'); assert.equal(events.length, 1); assert.equal(events[0].completed, true); assert.ok(events[0].id);
});
test('updating a version-1 installation switches to 12-second quotes and refreshes the balanced bank without losing work', () => {
  const old = make(); old.dispatch({ type: 'preferences', values: { quoteSeconds: 90, quietFocus: true, completionSound: false } }, 1000);
  old.dispatch({ type: 'note-add', text: 'Keep my idea' }, 1000); old.dispatch({ type: 'start', intention: 'Continue my project' }, 1000); old.dispatch({ type: 'stay' }, 2000);
  const saved = old.export(9000); saved.version = 1; saved.decks.everyday = ['A001', 'A002'];
  const updated = make(saved);
  assert.equal(updated.preferences.quoteSeconds, 12); assert.equal(updated.preferences.quietFocus, true); assert.equal(updated.preferences.completionSound, false);
  assert.equal(updated.notes[0].text, 'Keep my idea'); assert.equal(updated.session.intention, 'Continue my project'); assert.equal(updated.session.choices, 1); assert.equal(updated.session.elapsedMs, 8000); assert.equal(updated.session.running, false);
  assert.deepEqual(updated.decks.everyday, []); updated.quote(); assert.equal(updated.decks.everyday.length, 119);
  assert.equal(bank.everyday.length, 120); assert.equal(bank.hard.length, 43); assert.equal(bank.everyday.find(q => q.id === 'A120').text, "You can end the day unfinished and still let the day be over.");
  assert.equal(bank.hard.find(q => q.id === 'H043').author, 'James Dyson');
  updated.dispatch({ type: 'preferences', values: { quoteSeconds: 25 } }, 10000);
  const restarted = make(updated.export(10000)); assert.equal(restarted.preferences.quoteSeconds, 25); assert.deepEqual(restarted.decks, updated.decks);
});
test('pausing brings a tucked monkey out, resuming restores tuck, and explicit hiding stays hidden', () => {
  for (const setup of ['default','deep']) {
    const f = make(); if (setup === 'deep') f.dispatch({type:'preset',name:'deep'},1000);
    f.dispatch({type:'start'},1000); assert.equal(f.presence(),'peek');
    f.dispatch({type:'pause'},2000); assert.equal(f.presence(),'wander');
    f.dispatch({type:'presence',value:'peek'},2500); assert.equal(f.presence(),'peek');
    f.dispatch({type:'resume'},3000); assert.equal(f.presence(),'peek');
    f.dispatch({type:'presence',value:'wander'},3500); f.dispatch({type:'pause'},4000); f.dispatch({type:'resume'},4500);
    assert.equal(f.presence(),'peek','resume restores automatic focus tucking');
    f.dispatch({type:'presence',value:'hidden'},5000); f.dispatch({type:'pause'},6000); assert.equal(f.presence(),'hidden');
  }
});
test('Quotes on overrides silent preset settings and advanced quiet preferences remain explicit', () => {
  for (const preset of ['deep','blocker']) {
    const f=make(); f.dispatch({type:'preset',name:preset},1000);
    f.dispatch({type:'preferences',values:{quotesEnabled:true}},2000);
    assert.equal(f.preferences.autoQuotes,true); assert.equal(f.preferences.quietFocus,false);
    f.quote(); assert.ok(f.drainEvents().some(e=>e.type==='quote'));
    f.dispatch({type:'preferences',values:{quietFocus:true}},3000); assert.equal(f.preferences.quietFocus,true);
    f.dispatch({type:'preferences',values:{quotesEnabled:false}},4000); f.quote(); assert.equal(f.drainEvents().length,0);
    f.dispatch({type:'preferences',values:{quotesEnabled:true,autoQuotes:false}},5000); assert.equal(f.preferences.autoQuotes,false);
  }
});
test('neutral edges follow system theme or manual override and old colours cannot affect rendering', () => {
  const {focusEdges, defaults}=require('../desktop/focus.js');
  const f=make({version:2,preferences:{glowColor:'#ed873a',glowIntensity:37},notes:[{id:'saved',text:'Keep this'}]});
  assert.equal(f.preferences.screenStyle,'auto'); assert.equal(f.notes[0].text,'Keep this');
  assert.deepEqual(focusEdges(defaults,false),{style:'light',rgb:'40 40 40',alpha:.075});
  assert.deepEqual(focusEdges(defaults,true),{style:'dark',rgb:'0 0 0',alpha:.125});
  f.dispatch({type:'preferences',values:{screenStyle:'light',glowIntensity:0}},1000);
  assert.deepEqual(focusEdges(f.preferences,true),{style:'light',rgb:'40 40 40',alpha:0});
});
test('focus milestones fire once per threshold, exclude paused time and survive recovery',()=>{
 const f=make();f.dispatch({type:'preferences',values:{focusMinutes:1}},1000);f.dispatch({type:'start'},1000);f.drainEvents();
 for(const [at,percent]of [[16000,25],[31000,50],[46000,75]]){f.tick(at);assert.equal(f.drainEvents().find(e=>e.type==='milestone').percent,percent);f.tick(at+1);assert.equal(f.drainEvents().length,0);}
 const restored=make(f.export(46001));restored.dispatch({type:'resume'},50000);restored.tick(51000);assert.equal(restored.drainEvents().filter(e=>e.type==='milestone').length,0);
 restored.dispatch({type:'pause'},52000);restored.tick(90000);assert.equal(restored.drainEvents().length,0);restored.dispatch({type:'resume'},100000);restored.tick(114000);assert.equal(restored.history[0].completed,true);assert.equal(restored.drainEvents().filter(e=>e.type==='finished').length,1);
});
test('twenty pause/resume cycles restore focus peeking and stale state cannot roll either view back',()=>{
 const {acceptsState}=require('../desktop/focus.js'),f=make();f.dispatch({type:'start'},1000);
 for(let i=0;i<20;i++){f.dispatch({type:'pause'},2000+i*20);const paused=f.snapshot(2000+i*20);assert.equal(paused.presence,'wander');f.dispatch({type:'resume'},2001+i*20);const resumed=f.snapshot(2001+i*20);assert.equal(resumed.presence,'peek');assert.equal(acceptsState(resumed,paused),false);assert.equal(acceptsState(paused,resumed),true);}
});

test('upgrading a fully silent setup does not introduce celebrations',()=>{const f=make({version:2,preferences:{presence:'hidden',quotesEnabled:false,showHud:false,completionSound:false}});assert.equal(f.preferences.celebrations,false);f.dispatch({type:'preferences',values:{celebrations:true}},1000);assert.equal(f.preferences.celebrations,true);});
