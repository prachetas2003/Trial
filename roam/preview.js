(() => {
  'use strict';
  let cursor = { x: innerWidth / 2, y: innerHeight / 2 }, paused = false;
  const settings = { pet: 'monkey', ink: window.companion.focusInk || 'black', chasing: true, hopping: true };
  const areas = () => [{ id: 'browser', x: 0, y: 0, width: innerWidth, height: innerHeight }];
  const send = input => window.companion.send(input);
  send({ areas: areas(), activeId: 'browser', cursor, settings, paused });
  window.addEventListener('pointermove', event => { cursor = { x: event.clientX, y: event.clientY }; send({ cursor }); });
  window.addEventListener('resize', () => send({ areas: areas() }));
  const appearance = ink => {
    settings.ink = ink; document.body.classList.toggle('dark-screen', ink === 'white');
    for (const option of ['light', 'dark']) document.querySelector(`#${option}-screen`).setAttribute('aria-pressed', String(option === (ink === 'white' ? 'dark' : 'light')));
  };
  appearance(settings.ink);
  window.addEventListener('companion-appearance', event => appearance(event.detail));
  document.querySelector('#focus-open').addEventListener('click', () => window.companion.openFocus('timer'));
  for (const mode of ['light', 'dark']) document.querySelector(`#${mode}-screen`).addEventListener('click', () => {
    window.companion.focusAction({ type: 'appearance', ink: mode === 'dark' ? 'white' : 'black' });
  });
  document.querySelector('#pause').addEventListener('click', event => {
    paused = !paused; send({ paused }); event.currentTarget.textContent = paused ? 'Resume wandering' : 'Pause wandering';
  });
  document.querySelector('#call').addEventListener('click', () => {
    window.companion.focusAction({ type: 'preferences', values: { presence: 'wander', ...(window.__mischiefFocus?.session?.kind === 'focus' ? { peekDuringFocus: false } : {}) } });
    paused = false; document.querySelector('#pause').textContent = 'Pause wandering'; send({ paused, action: 'call' });
  });
  document.querySelector('#hello').addEventListener('click', () => send({ action: 'reach' }));
  document.querySelector('#jump').addEventListener('click', () => {
    paused = false; document.querySelector('#pause').textContent = 'Pause wandering'; send({ paused, action: 'jump' });
  });
  document.querySelector('#chasing').addEventListener('change', event => { settings.chasing = event.target.checked; send({ settings }); });
  document.querySelector('#hopping').addEventListener('change', event => { settings.hopping = event.target.checked; send({ settings }); });
  const moods = { idle: 'Taking a tiny breather.', wander: 'Off on a little adventure.', curious: 'Hmm. What are you making?', chase: 'Wait for me, cursor!', pet: 'Tiny heart: full.', reach: 'A little hello, just for you.', rest: 'Resting. Still available for head pats.', peek: 'A little company, from the edge.', return: 'Coming back to say hello.' };
  window.addEventListener('companion-frame', event => {
    const status = document.querySelector('#status'), message = moods[event.detail.mode];
    if (status.textContent !== message) status.textContent = message;
  });
})();
