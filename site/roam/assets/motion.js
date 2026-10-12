(function (root) {
  'use strict';
  const WINDOW = { width: 320, height: 370, footX: 160, footY: 336 };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function safeArea(area, scale = 1) {
    // Reserve the monkey's curled tail and enlarged reaching hand at turns.
    const margin = Math.min(128 * scale, area.width / 2);
    const top = Math.min(270 * scale, area.height / 2);
    const bottom = Math.min(32 * scale, area.height / 2);
    return { left: area.x + margin, right: area.x + area.width - margin, top: area.y + top, bottom: area.y + area.height - bottom };
  }
  function contains(area, p) { return p.x >= area.x && p.x <= area.x + area.width && p.y >= area.y && p.y <= area.y + area.height; }
  function hitsPet(cursor, x, y, hop = 0, scale = 1) { return ((cursor.x - x) / (74 * scale)) ** 2 + ((cursor.y - (y - (94 + hop) * scale)) / (86 * scale)) ** 2 <= 1; }
  // Exact critically damped spring for a target held constant over this step.
  function spring(state, target, frequency, dt) {
    const displacement = state.value - target;
    const term = state.velocity + frequency * displacement;
    const decay = Math.exp(-frequency * dt);
    state.value = target + (displacement + term * dt) * decay;
    state.velocity = (state.velocity - frequency * term * dt) * decay;
    return state.value;
  }
  function bezier(p, t) {
    const u = 1 - t;
    return { x: u ** 3 * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t ** 3 * p[3].x,
      y: u ** 3 * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t ** 3 * p[3].y };
  }
  class CompanionMotion {
    constructor({ areas, activeId, now = 0, random = Math.random }) {
      if (!areas?.length || areas.some(a => !Number.isFinite(a.x) || !Number.isFinite(a.y) || !(a.width > 0) || !(a.height > 0))) throw new Error('A valid display work area is required.');
      this.scale = 1; this.random = random; this.areas = areas.map(a => ({ ...a }));
      this.areaId = areas.some(a => a.id === activeId) ? activeId : areas[0].id;
      const b = this.bounds(); this.x = (b.left + b.right) / 2; this.y = Math.max(b.top, b.bottom - 70);
      this.target = { x: this.x, y: this.y }; this.vx = 0; this.vy = 0;
      this.mode = 'idle'; this.paused = false; this.chaseEnabled = true; this.hopsEnabled = true; this.presence = 'wander'; this.returning = false; this.chaseLocked = false; this.dragging = false; this.edge = 'right'; this.edgePosition = .85; this.dragCursor = null; this.dragOffset = { x: 0, y: 0 };
      this.dragWeight = { value: 0, velocity: 0 }; this.bodySwing = { value: 0, velocity: 0 }; this.legSwing = { value: 0, velocity: 0 };
      this.lastTime = now; this.simTime = now; this.accumulator = 0; this.actionUntil = now + 1800;
      this.nextChase = now + 7000; this.nextHop = now + 6500; this.nextReach = now + 10000;
      this.hopStart = null; this.hopDuration = 920; this.hopPeak = 55; this.landedAt = -Infinity;
      this.reachStart = null; this.reachDuration = 2100; this.lastCursor = null;
      this.strokeEnergy = 0; this.nextSparkle = now; this.sparkleId = 0; this.pettedUntil = 0;
      this.walkPhase = 0; this.wanderPath = null; this.heading = 0;
      this.look = { x: { value: 0, velocity: 0 }, y: { value: 0, velocity: 0 } };
      this.visual = { walk: { value: 0, velocity: 0 }, pet: { value: 0, velocity: 0 }, lean: { value: 0, velocity: 0 } };
      this.previous = this.snapshot();
    }
    area() { return this.areas.find(a => a.id === this.areaId) || this.areas[0]; }
    snapshot() {
      return { x: this.x, y: this.y, walkPhase: this.walkPhase, vx: this.vx, vy: this.vy,
        walk: this.visual.walk.value, pet: this.visual.pet.value, lean: this.visual.lean.value,
        lookX: this.look.x.value, lookY: this.look.y.value, dragWeight: this.dragWeight.value, bodySwing: this.bodySwing.value, legSwing: this.legSwing.value };
    }
    bounds() {
      const b = safeArea(this.area(), this.scale), a = this.area();
      if (this.presence === 'peek' || this.returning) {
        b.left = a.x + 18 * this.scale; b.right = a.x + a.width - 18 * this.scale;
        b.top = a.y + 150 * this.scale; b.bottom = a.y + a.height + 118 * this.scale;
      }
      return b;
    }
    peekTarget() {
      const a = this.area(), b = safeArea(a, this.scale), p = this.edgePosition;
      if (this.edge === 'top' || this.edge === 'bottom') return { x: lerp(a.x + 70 * this.scale, a.x + a.width - 70 * this.scale, p), y: this.edge === 'top' ? a.y + 154 * this.scale : a.y + a.height + 118 * this.scale };
      return { x: this.edge === 'left' ? a.x + 18 * this.scale : a.x + a.width - 18 * this.scale, y: lerp(b.top, b.bottom, p) };
    }
    setScale(value) {
      if (!Number.isFinite(value)) return;
      const next = clamp(value, .6, 1); if (next === this.scale) return;
      this.scale = next;
      if (this.presence === 'peek') this.target = this.peekTarget();
      else { const b = safeArea(this.area(), this.scale); if (this.x < b.left || this.x > b.right || this.y < b.top || this.y > b.bottom) { this.returning = true; this.target = { x: clamp(this.x, b.left, b.right), y: clamp(this.y, b.top, b.bottom) }; } }
    }
    setEdge(edge, position) {
      if (['left', 'right', 'top', 'bottom'].includes(edge)) this.edge = edge;
      if (Number.isFinite(position)) this.edgePosition = clamp(position, 0, 1);
      if (this.presence === 'peek') this.target = this.peekTarget();
    }
    setPresence(value, now) {
      if (value === this.presence) return;
      this.presence = value; this.pettedUntil = 0; this.strokeEnergy = 0; this.hopStart = null; this.reachStart = null; this.wanderPath = null;
      const b = safeArea(this.area(), this.scale);
      this.returning = value !== 'peek' && (this.x < b.left || this.x > b.right || this.y < b.top || this.y > b.bottom);
      this.mode = value === 'peek' ? 'peek' : this.returning ? 'return' : 'idle';
      this.target = value === 'peek' ? this.peekTarget() : { x: clamp(this.x, b.left, b.right), y: clamp(this.y, b.top, b.bottom) };
      this.actionUntil = now + 1800;
    }
    setChasing(value, now) {
      if (this.chaseLocked === value) return;
      this.chaseLocked = value; this.wanderPath = null; this.reachStart = null;
      this.mode = this.returning ? 'return' : value ? 'chase' : 'idle'; this.actionUntil = value ? Infinity : now + 1800;
      if (!value && !this.returning) this.target = { x: this.x, y: this.y };
    }
    beginDrag(cursor, now) {
      this.dragging = true; this.dragOffset = { x: this.x - cursor.x, y: this.y - cursor.y };
      this.dragCursor = { ...cursor }; this.hopStart = null; this.reachStart = null; this.pettedUntil = 0;
      this.wanderPath = null; this.mode = 'drag'; this.lastTime = now;
      this.vx = this.vy = 0;
    }
    dragTo(cursor) { if (this.dragging) this.dragCursor = { ...cursor }; }
    endDrag(now) {
      if (!this.dragging) return null;
      this.dragging = false; this.actionUntil = now + 1300;
      this.vx = clamp(this.vx, -120, 120); this.vy = clamp(this.vy, -120, 120);
      this.mode = this.presence === 'peek' ? 'peek' : this.chaseLocked ? 'chase' : 'idle';
      this.target = this.presence === 'peek' ? this.peekTarget() : { x: this.x, y: this.y };
      const b = safeArea(this.area(), this.scale); this.returning = this.presence !== 'peek' && (this.x < b.left || this.x > b.right || this.y < b.top || this.y > b.bottom);
      if (this.returning) this.target = { x: clamp(this.x, b.left, b.right), y: clamp(this.y, b.top, b.bottom) };
      return { edge: this.edge, edgePosition: this.edgePosition };
    }
    updateHeld(dt) {
      const a = this.area(), c = this.dragCursor, b = safeArea(a, this.scale);
      let x = c.x + this.dragOffset.x, y = c.y + this.dragOffset.y;
      if (this.presence === 'peek') {
        const distances = [ ['left', Math.abs(c.x - a.x)], ['right', Math.abs(c.x - a.x - a.width)], ['top', Math.abs(c.y - a.y)], ['bottom', Math.abs(c.y - a.y - a.height)] ];
        distances.sort((p, q) => p[1] - q[1]); this.edge = distances[0][0];
        this.edgePosition = ['top', 'bottom'].includes(this.edge) ? clamp((c.x - a.x - 70 * this.scale) / Math.max(1, a.width - 140 * this.scale), 0, 1) : clamp((y - b.top) / Math.max(1, b.bottom - b.top), 0, 1);
        ({ x, y } = this.peekTarget());
      } else { x = clamp(x, b.left, b.right); y = clamp(y, b.top, b.bottom); }
      this.vx = clamp((x - this.x) / dt, -1600, 1600); this.vy = clamp((y - this.y) / dt, -1600, 1600);
      this.x = x; this.y = y; this.target = { x, y }; this.mode = 'drag';
    }
    heldPose(dt) {
      spring(this.dragWeight, this.dragging ? 1 : 0, 15, dt);
      // Damped pendulums retain momentum through turns and settle after release.
      for (const [s, goal, stiffness, damping] of [[this.bodySwing, this.dragging ? clamp(-this.vx / 4200, -.28, .28) : 0, 80, 7], [this.legSwing, this.dragging ? clamp(-this.vx / 1800, -.7, .7) : 0, 55, 5]]) {
        s.velocity += ((goal - s.value) * stiffness - s.velocity * damping) * dt;
        s.value = clamp(s.value + s.velocity * dt, -1, 1);
      }
    }
    setAreas(areas) {
      const valid = areas.filter(a => Number.isFinite(a.x) && Number.isFinite(a.y) && a.width > 0 && a.height > 0);
      if (!valid.length) return;
      this.areas = valid.map(a => ({ ...a }));
      if (!this.areas.some(a => a.id === this.areaId)) this.areaId = this.areas[0].id;
      const b = this.bounds(); this.x = clamp(this.x, b.left, b.right); this.y = clamp(this.y, b.top, b.bottom);
      this.target = { x: clamp(this.target.x, b.left, b.right), y: clamp(this.target.y, b.top, b.bottom) };
      this.previous = this.snapshot(); this.wanderPath = null;
    }
    pause(value, now) {
      this.paused = value; this.hopStart = null; this.reachStart = null;
      this.vx = 0; this.vy = 0;
      if (this.presence === 'peek' || this.returning) { this.previous = this.snapshot(); return; }
      this.mode = 'idle'; this.wanderPath = null;
      this.target = { x: this.x, y: this.y }; this.actionUntil = now + 1800;
      this.previous = this.snapshot();
    }
    followCursor(cursor, now) {
      const area = this.areas.find(a => contains(a, cursor)) || this.area();
      this.areaId = area.id; this.setAreas(this.areas);
      this.mode = 'chase'; this.actionUntil = now + 4300; this.reachStart = null;
      const b = this.bounds(); this.target = { x: clamp(cursor.x - 70, b.left, b.right), y: clamp(cursor.y + 94, b.top, b.bottom) };
      this.nextChase = now + 14000; this.jump(now);
    }
    jump(now) {
      if (this.paused || !this.hopsEnabled || this.hopStart !== null || this.reachStart !== null) return;
      this.hopStart = now; this.hopDuration = 900 + this.random() * 130; this.hopPeak = 50 + this.random() * 16;
      this.nextHop = now + 10000 + this.random() * 10000;
    }
    reach(now) {
      if (this.hopStart !== null || this.reachStart !== null) return;
      this.reachStart = now; this.mode = 'reach'; this.actionUntil = now + this.reachDuration + 1200;
      this.nextReach = now + 22000 + this.random() * 12000;
    }
    chooseBehavior(now, cursor) {
      const distance = Math.hypot(cursor.x - this.x, cursor.y - this.y + 94);
      const choice = this.random();
      if (this.chaseEnabled && now >= this.nextChase && distance > 130 && distance < 1000 && choice > .78) { this.followCursor(cursor, now); return; }
      if (now >= this.nextReach && choice < .16 && distance < 650) { this.reach(now); return; }
      if (choice < .32) {
        this.mode = choice < .13 ? 'idle' : 'curious'; this.wanderPath = null;
        this.target = { x: this.x, y: this.y }; this.actionUntil = now + 2200 + this.random() * 2500; return;
      }
      const b = this.bounds(), end = { x: lerp(b.left, b.right, this.random()), y: lerp(b.top, b.bottom, this.random()) };
      const dx = end.x - this.x, dy = end.y - this.y, distanceToEnd = Math.hypot(dx, dy);
      const bend = (this.random() - .5) * .9;
      const carry = Math.hypot(this.vx, this.vy) > 10;
      const p1 = { x: this.x + (carry ? this.vx * .55 : dx * .32 - dy * bend), y: this.y + (carry ? this.vy * .55 : dy * .32 + dx * bend) };
      const p2 = { x: end.x - dx * .27 - dy * bend * .5, y: end.y - dy * .27 + dx * bend * .5 };
      this.wanderPath = { points: [{ x: this.x, y: this.y }, p1, p2, end], start: now, duration: clamp(distanceToEnd / 64 * 1000, 2600, 9500) };
      this.mode = 'wander'; this.target = end; this.actionUntil = now + this.wanderPath.duration + 900;
    }
    pose(now) {
      let hop = 0, anticipation = 0, landing = 0, jumpPhase = 'ground';
      if (this.hopStart !== null) {
        const t = (now - this.hopStart) / this.hopDuration;
        if (t < .19) { anticipation = Math.sin(Math.PI * clamp(t / .19, 0, 1)); jumpPhase = 'anticipation'; }
        else if (t < .79) { const flight = (t - .19) / .60; hop = 4 * flight * (1 - flight) * this.hopPeak; jumpPhase = 'air'; }
        else if (t < 1) { landing = Math.sin(Math.PI * (t - .79) / .21); jumpPhase = 'landing'; }
        else { this.hopStart = null; this.landedAt = now; }
      }
      let reach = 0;
      if (this.reachStart !== null) {
        const t = (now - this.reachStart) / this.reachDuration;
        if (t < .38) reach = ease(t / .38);
        else if (t < .62) reach = 1;
        else if (t < 1) reach = 1 - ease((t - .62) / .38);
        else { this.reachStart = null; this.mode = 'idle'; }
      }
      return { hop, anticipation, landing, jumpPhase, reach };
    }
    step(dt, now, cursor, hovering, pose) {
      this.previous = this.snapshot();
      if (this.dragging) { this.updateHeld(dt); this.heldPose(dt); spring(this.visual.walk, 0, 14, dt); spring(this.visual.pet, 0, 10, dt); return; }
      this.heldPose(dt);
      const edgeTravel = this.presence === 'peek' || this.returning;
      const occupied = !edgeTravel && (this.paused || hovering || now < this.pettedUntil || this.reachStart !== null);
      if (this.presence === 'peek') {
        this.target = this.peekTarget();
        if (now >= this.pettedUntil && this.reachStart === null) this.mode = 'peek';
      }
      if (this.chaseLocked && !edgeTravel && !this.paused && !occupied) { this.mode = 'chase'; this.actionUntil = Infinity; }
      if (!occupied) {
        if (this.mode === 'pet') this.actionUntil = now;
        if (!edgeTravel && !this.chaseLocked && now >= this.actionUntil) this.chooseBehavior(now, cursor);
        if (this.mode === 'chase') {
          const b = this.bounds(), dx = cursor.x - this.x, dy = cursor.y - this.y + 94, d = Math.hypot(dx, dy) || 1;
          this.target = { x: clamp(cursor.x - dx / d * 92, b.left, b.right), y: clamp(cursor.y + 94 - dy / d * 62, b.top, b.bottom) };
        } else if (this.mode === 'wander' && this.wanderPath) {
          const p = this.wanderPath; this.target = bezier(p.points, clamp((now - p.start + 480) / p.duration, 0, 1));
        }
        if (!edgeTravel && now >= this.nextHop && Math.hypot(this.vx, this.vy) > 15) this.jump(now);
      }
      const moving = !occupied && (edgeTravel || ['wander', 'chase'].includes(this.mode));
      const dx = this.target.x - this.x, dy = this.target.y - this.y, distance = Math.hypot(dx, dy);
      const maxSpeed = edgeTravel ? 240 : this.mode === 'chase' ? 145 : 76;
      const speed = moving && distance > 3 && pose.jumpPhase !== 'anticipation' ? Math.min(maxSpeed, distance * 1.9) : 0;
      const desiredX = distance > 0 ? dx / distance * speed : 0, desiredY = distance > 0 ? dy / distance * speed : 0;
      const smoothing = 1 - Math.exp(-dt * (occupied ? 18 : 6.5));
      let dvx = (desiredX - this.vx) * smoothing, dvy = (desiredY - this.vy) * smoothing;
      const change = Math.hypot(dvx, dvy), maxChange = (occupied ? 650 : 420) * dt;
      if (change > maxChange) { dvx *= maxChange / change; dvy *= maxChange / change; }
      this.vx += dvx; this.vy += dvy;
      if (Math.hypot(this.vx, this.vy) < .15 && !moving) { this.vx = 0; this.vy = 0; }
      const b = this.bounds(); this.x = clamp(this.x + this.vx * dt, b.left, b.right); this.y = clamp(this.y + this.vy * dt, b.top, b.bottom);
      if ((this.x === b.left && this.vx < 0) || (this.x === b.right && this.vx > 0)) this.vx = 0;
      if ((this.y === b.top && this.vy < 0) || (this.y === b.bottom && this.vy > 0)) this.vy = 0;
      if (this.returning && Math.hypot(this.target.x - this.x, this.target.y - this.y) < 2) { this.returning = false; this.mode = 'idle'; this.actionUntil = now + 1800; }
      const velocity = Math.hypot(this.vx, this.vy);
      if (pose.jumpPhase === 'ground' && velocity > 1) this.walkPhase += velocity * dt / 58 * Math.PI * 2;
      spring(this.visual.walk, pose.jumpPhase === 'ground' ? clamp(velocity / 65, 0, 1) : 0, 14, dt);
      spring(this.visual.pet, now < this.pettedUntil ? 1 : 0, 10, dt);
      spring(this.visual.lean, this.vx / 145, 9, dt);
      spring(this.look.x, clamp((cursor.x - this.x) / 210, -1, 1), 11, dt);
      spring(this.look.y, clamp((cursor.y - this.y + 94 + pose.hop) / 210, -1, 1), 11, dt);
    }
    advance(now, cursor) {
      const elapsed = clamp((now - this.lastTime) / 1000, 0, .06); this.lastTime = now;
      if (!cursor || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) cursor = this.lastCursor || { x: this.x, y: this.y };
      let pose = this.pose(now);
      const hovering = hitsPet(cursor, this.x, this.y, pose.hop, this.scale);
      const cursorMotion = this.lastCursor ? Math.hypot(cursor.x - this.lastCursor.x, cursor.y - this.lastCursor.y) : 0;
      this.strokeEnergy = Math.max(0, this.strokeEnergy - elapsed * 12);
      if (!this.dragging && hovering && cursorMotion >= .5 && cursorMotion < 180) {
        this.strokeEnergy += Math.min(30, cursorMotion);
        if (this.strokeEnergy >= 22 && now >= this.nextSparkle) {
          this.sparkleId++; this.strokeEnergy = 0; this.nextSparkle = now + 330;
          this.pettedUntil = now + 1700; this.mode = 'pet'; this.reachStart = null;
        }
      }
      this.lastCursor = { ...cursor };
      // Physics is independent of the display rate. Render between 120 Hz states.
      this.accumulator += elapsed;
      const step = 1 / 120;
      while (this.accumulator + 1e-9 >= step) {
        this.simTime += step * 1000;
        this.step(step, now - this.accumulator * 1000, cursor, hovering, pose);
        this.accumulator -= step;
      }
      pose = this.pose(now);
      const alpha = clamp(this.accumulator / step, 0, 1);
      const x = lerp(this.previous.x, this.x, alpha), y = lerp(this.previous.y, this.y, alpha);
      const mode = this.dragging ? 'drag' : now < this.pettedUntil ? 'pet' : this.reachStart !== null ? 'reach' : this.paused ? 'rest' : hovering ? 'curious' : this.mode;
      return { x, y, hop: pose.hop, vx: lerp(this.previous.vx, this.vx, alpha), vy: lerp(this.previous.vy, this.vy, alpha), mode, ...pose,
        areaId: this.areaId, walkPhase: lerp(this.previous.walkPhase, this.walkPhase, alpha), walkWeight: lerp(this.previous.walk, this.visual.walk.value, alpha), petWeight: lerp(this.previous.pet, this.visual.pet.value, alpha),
        moving: Math.hypot(this.vx, this.vy) > 5, lookX: lerp(this.previous.lookX, this.look.x.value, alpha), lookY: lerp(this.previous.lookY, this.look.y.value, alpha), lean: lerp(this.previous.lean, this.visual.lean.value, alpha),
        scaleX: 1 + pose.anticipation * .09 + pose.landing * .14 - (pose.hop > 1 ? .035 : 0),
        scaleY: 1 - pose.anticipation * .11 - pose.landing * .16 + (pose.hop > 1 ? .055 : 0),
        dragging: this.dragging, edge: this.edge, dragWeight: lerp(this.previous.dragWeight, this.dragWeight.value, alpha), bodySwing: lerp(this.previous.bodySwing, this.bodySwing.value, alpha), legSwing: lerp(this.previous.legSwing, this.legSwing.value, alpha),
        sparkleId: this.sparkleId, cursorX: cursor.x, cursorY: cursor.y,
        windowX: x - WINDOW.footX, windowY: y - WINDOW.footY };
    }
  }
  const api = { CompanionMotion, safeArea, hitsPet, WINDOW, spring, ease };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BuildlingsMotion = api;
})(typeof window !== 'undefined' ? window : globalThis);
