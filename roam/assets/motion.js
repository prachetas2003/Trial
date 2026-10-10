(function (root) {
  'use strict';
  const WINDOW = { width: 260, height: 320, footX: 130, footY: 292 };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function safeArea(area) {
    const marginX = Math.min(WINDOW.width / 2 + 4, area.width / 2);
    const top = Math.min(WINDOW.footY + 4, area.height / 2);
    const bottom = Math.min(WINDOW.height - WINDOW.footY + 4, area.height / 2);
    return { left: area.x + marginX, right: area.x + area.width - marginX, top: area.y + top, bottom: area.y + area.height - bottom };
  }
  function contains(area, point) { return point.x >= area.x && point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height; }
  function hitsPet(cursor, x, y, hop = 0) { return ((cursor.x - x) / 68) ** 2 + ((cursor.y - (y - 80 - hop)) / 76) ** 2 <= 1; }

  class CompanionMotion {
    constructor({ areas, activeId, now = 0, random = Math.random }) {
      this.random = random;
      this.areas = areas.map(a => ({ ...a }));
      if (!this.areas.length || this.areas.some(a => !Number.isFinite(a.x) || !Number.isFinite(a.y) || !(a.width > 0) || !(a.height > 0))) throw new Error('A valid display work area is required.');
      this.areaId = this.areas.some(a => a.id === activeId) ? activeId : this.areas[0].id;
      const area = this.bounds();
      this.x = (area.left + area.right) / 2;
      this.y = Math.max(area.top, area.bottom - 60);
      this.target = { x: this.x, y: this.y };
      this.vx = 0; this.vy = 0; this.mode = 'idle'; this.paused = false;
      this.chaseEnabled = true; this.hopsEnabled = true;
      this.lastTime = now; this.actionUntil = now + 1200;
      this.nextChase = now + 5000; this.nextHop = now + 3500;
      this.hopStart = null; this.hopDuration = 900; this.hopPeak = 55; this.landedAt = -Infinity;
      this.lastCursor = null; this.strokeEnergy = 0; this.nextSparkle = now;
      this.sparkleId = 0; this.pettedUntil = 0; this.walkPhase = 0;
    }
    area() { return this.areas.find(a => a.id === this.areaId) || this.areas[0]; }
    bounds() { return safeArea(this.area()); }
    setAreas(areas) {
      const valid = areas.filter(a => Number.isFinite(a.x) && Number.isFinite(a.y) && a.width > 0 && a.height > 0);
      if (!valid.length) return;
      this.areas = valid.map(a => ({ ...a }));
      if (!this.areas.some(a => a.id === this.areaId)) this.areaId = this.areas[0].id;
      const b = this.bounds(); this.x = clamp(this.x, b.left, b.right); this.y = clamp(this.y, b.top, b.bottom);
      this.target = { x: clamp(this.target.x, b.left, b.right), y: clamp(this.target.y, b.top, b.bottom) };
    }
    pause(value, now) {
      this.paused = value; this.hopStart = null; this.vx = 0; this.vy = 0;
      this.mode = 'idle'; this.target = { x: this.x, y: this.y }; this.actionUntil = now + 1200;
    }
    followCursor(cursor, now) {
      const targetArea = this.areas.find(a => contains(a, cursor)) || this.area();
      this.areaId = targetArea.id;
      const b = this.bounds(); this.x = clamp(this.x, b.left, b.right); this.y = clamp(this.y, b.top, b.bottom);
      this.mode = 'chase'; this.actionUntil = now + 3000;
      this.target = { x: clamp(cursor.x - 55, b.left, b.right), y: clamp(cursor.y + 85, b.top, b.bottom) };
      this.nextChase = now + 10000; this.jump(now);
    }
    jump(now) {
      if (this.paused || !this.hopsEnabled || this.hopStart !== null) return;
      this.hopStart = now; this.hopDuration = 720 + this.random() * 300; this.hopPeak = 40 + this.random() * 28;
      this.nextHop = now + 5000 + this.random() * 7000;
    }
    chooseBehavior(now, cursor) {
      const distance = Math.hypot(cursor.x - this.x, cursor.y - (this.y - 80));
      const choice = this.random();
      if (this.chaseEnabled && now >= this.nextChase && distance > 80 && distance < 1000 && choice > .70) {
        this.followCursor(cursor, now); return;
      }
      const b = this.bounds();
      if (choice < .25) {
        this.mode = choice < .12 ? 'idle' : 'curious';
        this.target = { x: this.x, y: this.y }; this.actionUntil = now + 1400 + this.random() * 2200;
      } else {
        this.mode = 'wander';
        this.target = { x: b.left + this.random() * (b.right - b.left), y: b.top + this.random() * (b.bottom - b.top) };
        this.actionUntil = now + 2500 + this.random() * 4000;
      }
    }
    advance(now, cursor) {
      const dt = clamp((now - this.lastTime) / 1000, 0, .06);
      this.lastTime = now;
      if (!cursor || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) cursor = this.lastCursor || { x: this.x, y: this.y };
      let hop = 0;
      if (this.hopStart !== null) {
        const t = (now - this.hopStart) / this.hopDuration;
        if (t >= 1) { this.hopStart = null; this.landedAt = now; }
        else hop = Math.sin(Math.PI * clamp(t, 0, 1)) * this.hopPeak;
      }
      const hovering = hitsPet(cursor, this.x, this.y, hop);
      const cursorMotion = this.lastCursor ? Math.hypot(cursor.x - this.lastCursor.x, cursor.y - this.lastCursor.y) : 0;
      this.strokeEnergy = Math.max(0, this.strokeEnergy - dt * 10);
      if (hovering && cursorMotion >= 1.5 && cursorMotion < 180) {
        this.strokeEnergy += Math.min(30, cursorMotion);
        if (this.strokeEnergy >= 20 && now >= this.nextSparkle) {
          this.sparkleId++; this.strokeEnergy = 0; this.nextSparkle = now + 280;
          this.pettedUntil = now + 1500; this.mode = 'pet';
        }
      }
      this.lastCursor = { ...cursor };
      if (!this.paused && !hovering && now >= this.pettedUntil) {
        if (this.mode === 'pet') this.actionUntil = now;
        if (now >= this.actionUntil) this.chooseBehavior(now, cursor);
        if (this.mode === 'chase') {
          const b = this.bounds();
          this.target = { x: clamp(cursor.x + (cursor.x < this.x ? 48 : -48), b.left, b.right), y: clamp(cursor.y + 88, b.top, b.bottom) };
        }
        if (now >= this.nextHop) this.jump(now);
      }
      const moving = !this.paused && !hovering && now >= this.pettedUntil && ['wander', 'chase'].includes(this.mode);
      const dx = this.target.x - this.x, dy = this.target.y - this.y, distance = Math.hypot(dx, dy);
      const speed = this.mode === 'chase' ? 145 : 72;
      const desiredX = moving && distance > 8 ? dx / distance * Math.min(speed, distance * 2) : 0;
      const desiredY = moving && distance > 8 ? dy / distance * Math.min(speed, distance * 2) : 0;
      const smoothing = 1 - Math.exp(-dt * 8);
      this.vx += (desiredX - this.vx) * smoothing; this.vy += (desiredY - this.vy) * smoothing;
      // Stop immediately for stroking, instead of sliding away from the pointer.
      if (hovering || this.paused || now < this.pettedUntil) { this.vx = 0; this.vy = 0; }
      const b = this.bounds();
      this.x = clamp(this.x + this.vx * dt, b.left, b.right); this.y = clamp(this.y + this.vy * dt, b.top, b.bottom);
      this.walkPhase += Math.hypot(this.vx, this.vy) * dt * .075;
      const landing = clamp((now - this.landedAt) / 240, 0, 1);
      const impact = landing < 1 ? Math.sin(Math.PI * landing) : 0;
      const mode = now < this.pettedUntil ? 'pet' : this.paused ? 'rest' : hovering ? 'curious' : this.mode;
      return {
        x: this.x, y: this.y, hop, vx: this.vx, vy: this.vy, mode,
        walkPhase: this.walkPhase, moving: moving && Math.hypot(this.vx, this.vy) > 6,
        lookX: clamp((cursor.x - this.x) / 180, -1, 1), lookY: clamp((cursor.y - (this.y - 80 - hop)) / 180, -1, 1),
        scaleX: (hop > 1 ? .96 : 1) + impact * .14,
        scaleY: (hop > 1 ? 1.045 : 1) - impact * .14,
        sparkleId: this.sparkleId, cursorX: cursor.x, cursorY: cursor.y,
        windowX: Math.round(this.x - WINDOW.footX), windowY: Math.round(this.y - WINDOW.footY)
      };
    }
  }
  const api = { CompanionMotion, safeArea, hitsPet, WINDOW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BuildlingsMotion = api;
})(typeof window !== 'undefined' ? window : globalThis);
