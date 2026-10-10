'use strict';
window.companion = {
  native: false, listener: null, latest: null,
  onInput(callback) { this.listener = callback; if (this.latest) callback(this.latest); },
  send(input) { this.latest = { ...this.latest, ...input }; this.listener?.(input); },
  ready() { window.dispatchEvent(new Event('companion-ready')); }
};
