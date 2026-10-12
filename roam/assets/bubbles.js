// Speech belongs to the doodle, never to a rectangular desktop window.
export class SpeechBubble {
  constructor() {
    this.element = document.createElement('aside'); this.element.id = 'speech-bubble'; this.element.hidden = true;
    this.element.setAttribute('role', 'status'); this.element.setAttribute('aria-live', 'polite');
    this.accessible = document.createElement('span'); this.accessible.className = 'sr-only';
    this.text = document.createElement('span'); this.text.className = 'bubble-words'; this.text.setAttribute('aria-hidden', 'true');
    this.author = document.createElement('span'); this.author.className = 'bubble-author'; this.author.setAttribute('aria-hidden', 'true');
    this.element.append(this.accessible, this.text, this.author); document.body.append(this.element);
    this.quote = null;
  }
  show(quote, now) {
    this.quote = quote; this.startedAt = now; this.words = quote.text.split(' '); this.wordCount = 0;
    this.until = now + Math.max(9000, Math.min(quote.category === 'everyday' ? 11500 : 22000, this.words.length * 350 + 5000));
    this.element.hidden = false; this.element.classList.remove('bubble-exit');
    this.accessible.textContent = quote.author ? `${quote.text} — ${quote.author}` : quote.text;
    this.text.style.minHeight = '';
    this.text.textContent = quote.author ? `“${quote.text}”` : quote.text;
    this.author.textContent = quote.author ? `— ${quote.author}` : '';
    this.width = this.element.offsetWidth; this.height = this.element.offsetHeight;
    this.text.style.minHeight = `${this.text.offsetHeight}px`;
    this.element.dataset.kind = quote.category;
    this.text.textContent = ''; this.author.style.opacity = '0';
  }
  draw(frame, now, reducedMotion) {
    if (!this.quote) return;
    if (now > this.until) { this.element.hidden = true; this.quote = null; return; }
    const count = reducedMotion ? this.words.length : Math.min(this.words.length, Math.floor((now - this.startedAt) / 55) + 1);
    if (count !== this.wordCount) {
      this.wordCount = count;
      const content = this.words.slice(0, count).join(' ');
      this.text.textContent = this.quote.author ? `“${content}${count === this.words.length ? '”' : ''}` : content;
      this.author.style.opacity = count === this.words.length ? '1' : '0';
    }
    const headX = frame.x, headY = frame.y - (145 + frame.hop) * (frame.scale || 1);
    const left = Math.max(12, Math.min(innerWidth - this.width - 12, headX - this.width * .6));
    const top = Math.max((document.querySelector('#timer-bar')?.getBoundingClientRect().bottom || 0) + 12, Math.min(innerHeight - this.height - 18, headY - this.height - 25));
    this.element.style.transform = `translate3d(${left}px,${top}px,0)`;
    this.element.style.setProperty('--tail-x', `${Math.max(22, Math.min(this.width - 25, headX - left))}px`);
    this.element.classList.toggle('bubble-exit', !reducedMotion && now > this.until - 350);
  }
}
