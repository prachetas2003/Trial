(function(root){
  // Keep a phase deadline instead of resetting to each RAF timestamp. A reset
  // turns small scheduling jitter into skipped frames (especially at 144 Hz).
  class FrameClock {
    constructor(hz=60){this.interval=1000/hz;this.next=null;}
    due(now){
      if(this.next===null||now-this.next>this.interval*4){this.next=now+this.interval;return true;}
      if(now+.5<this.next)return false;
      this.next+=this.interval;return true;
    }
  }
  const api={FrameClock};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MischiefFrames=api;
})(typeof window!=='undefined'?window:globalThis);
