// One audio owner lives in the long-lived desktop overlay, never the controls panel.
export class BackgroundMusic {
  constructor() {
    this.audio = new Audio(new URL('./quiet-branch.ogg', import.meta.url));
    this.audio.loop = true;
    this.audio.preload = 'none';
    this.enabled = false;
    this.suspended = false;
    this.failed = false;
    this.attempt = 0;
    this.status = window.__mischiefMusic = { playing: false, error: false };
    this.audio.addEventListener('playing', () => { this.status.playing = true; });
    this.audio.addEventListener('pause', () => { this.status.playing = false; });
    this.audio.addEventListener('error', () => this.fail());
  }
  configure(preferences) {
    const enabled = preferences.musicEnabled === true;
    if (enabled !== this.enabled) this.failed = false;
    this.enabled = enabled;
    this.audio.volume = Math.max(0, Math.min(1, (preferences.musicVolume ?? 35) / 100));
    this.sync();
  }
  suspend(value) { this.suspended = value; this.sync(); }
  fail() {
    if (this.failed) return;
    this.failed = true; this.status.error = true; this.status.playing = false;
    window.dispatchEvent(new Event('mischief-music-error'));
  }
  sync() {
    const shouldPlay = this.enabled && !this.suspended;
    if (!shouldPlay) {
      this.attempt++; this.starting = false; this.audio.pause();
      return;
    }
    if (this.failed || this.starting || !this.audio.paused) return;
    const attempt = ++this.attempt;
    this.starting = true; this.status.error = false;
    this.audio.play().then(() => {
      if (attempt !== this.attempt) return;
      this.starting = false;
      if (!this.enabled || this.suspended) this.audio.pause();
    }).catch(() => {
      if (attempt !== this.attempt) return;
      this.starting = false; this.fail();
    });
  }
}
