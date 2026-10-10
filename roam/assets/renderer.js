'use strict';
const pet = document.querySelector('#pet');
const space = document.querySelector('#pet-space');
const shadow = document.querySelector('#shadow');
const particles = document.querySelector('#particles');
let selected = '', lastSparkle = 0;
function sparkles(frame) {
  for (let i = 0; i < 9; i++) {
    const particle = document.createElement('span'); particle.className = 'sparkle' + (i === 0 ? ' heart' : '');
    const angle = Math.random() * Math.PI * 2;
    particle.style.left = `${130 + Math.cos(angle) * 42}px`;
    particle.style.top = `${202 - frame.hop + Math.sin(angle) * 35}px`;
    particle.style.setProperty('--dx', `${Math.cos(angle) * (25 + Math.random() * 40)}px`);
    particle.style.setProperty('--dy', `${-30 - Math.random() * 55}px`);
    particle.style.setProperty('--spin', `${(Math.random() - .5) * 100}deg`);
    particle.innerHTML = i === 0 ? '<svg viewBox="0 0 20 20"><path d="M10 17 3 10C-3 3 5-2 10 5 15-2 23 3 17 10z"/></svg>' : '<svg viewBox="0 0 20 20" fill="currentColor"><path d="m10 0 2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z"/></svg>';
    particles.append(particle); setTimeout(() => particle.remove(), 1000);
  }
}
function draw(frame) {
  if (selected !== frame.pet) {
    selected = frame.pet;
    const data = window.Buildlings.PETS.find(p => p.id === selected) || window.Buildlings.PETS[0];
    pet.innerHTML = window.BuildlingsArt.volumePetSVG(data); pet.setAttribute('aria-label', `${data.name}, your desktop companion`);
  }
  document.body.dataset.mood = frame.mode;
  const step = frame.moving ? Math.sin(frame.walkPhase) : 0;
  const breathing = frame.moving ? 0 : Math.sin(performance.now() / 800) * 1.5;
  space.style.transform = `translateY(${-frame.hop - Math.abs(step) * 2 - breathing}px)`;
  pet.style.transform = `rotateY(${frame.lookX * 13}deg) rotateX(${-frame.lookY * 5}deg) rotateZ(${frame.vx / 145 * 3 + step * 1.5}deg) scale(${frame.scaleX},${frame.scaleY})`;
  pet.querySelector('.face').setAttribute('transform', `translate(${frame.lookX * 5} ${frame.lookY * 3})`);
  pet.querySelector('.paw-left').setAttribute('transform', `translate(0 ${step * 4}) rotate(${step * 6} 90 203)`);
  pet.querySelector('.paw-right').setAttribute('transform', `translate(0 ${-step * 4}) rotate(${-step * 6} 177 203)`);
  pet.querySelector('.arm-left').setAttribute('transform', `rotate(${-step * 8} 57 151)`);
  pet.querySelector('.arm-right').setAttribute('transform', `rotate(${step * 8} 212 151)`);
  pet.querySelector('.ear-left').style.transform = `rotate(${-step * 4 + frame.lookX * 2}deg)`;
  pet.querySelector('.ear-right').style.transform = `rotate(${step * 4 + frame.lookX * 2}deg)`;
  shadow.style.transform = `scale(${1 - frame.hop / 150},${1 - frame.hop / 220})`;
  shadow.style.opacity = String(1 - frame.hop / 100);
  if (frame.sparkleId !== lastSparkle) { lastSparkle = frame.sparkleId; sparkles(frame); }
  window.__buildlingsFrame = frame;
}
window.companion.onFrame(draw);
window.companion.ready();
