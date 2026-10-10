'use strict';
window.companion = {
  listener: null,
  onFrame(callback) { this.listener = callback; },
  ready() { window.dispatchEvent(new Event('companion-ready')); }
};
